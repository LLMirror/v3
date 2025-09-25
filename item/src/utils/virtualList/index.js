import { h, defineComponent, ref, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import Virtual from './virtual'
import { Item, Slot } from './item'
import { VirtualProps } from './props'

const EVENT_TYPE = {
  ITEM: 'item_resize',
  SLOT: 'slot_resize'
}
const SLOT_TYPE = {
  HEADER: 'thead', // string value also use for aria role attribute
  FOOTER: 'tfoot'
}

export const VirtualList = defineComponent({
  name: 'VirtualList',

  props: VirtualProps,

  emits: ['resized', 'scroll', 'totop', 'tobottom'],

  setup(props, { emit, slots }) {
    const range = ref(null)
    const root = ref(null)
    const shepherd = ref(null)
    const virtual = ref(null)

    const isHorizontal = ref(props.direction === 'horizontal')
    const directionKey = ref(isHorizontal.value ? 'scrollLeft' : 'scrollTop')

    // Methods
    const getUniqueIdFromDataSources = () => {
      const { dataKey } = props
      return props.dataSources.map(dataSource =>
        typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      )
    }

    const getSize = (id) => {
      return virtual.value?.sizes.get(id)
    }

    const getSizes = () => {
      return virtual.value?.sizes.size
    }

    const getOffset = () => {
      if (props.pageMode) {
        return document.documentElement[directionKey.value] || document.body[directionKey.value]
      } else {
        return root.value ? Math.ceil(root.value[directionKey.value]) : 0
      }
    }

    const getClientSize = () => {
      const key = isHorizontal.value ? 'clientWidth' : 'clientHeight'
      if (props.pageMode) {
        return document.documentElement[key] || document.body[key]
      } else {
        return root.value ? Math.ceil(root.value[key]) : 0
      }
    }

    const getScrollSize = () => {
      const key = isHorizontal.value ? 'scrollWidth' : 'scrollHeight'
      if (props.pageMode) {
        return document.documentElement[key] || document.body[key]
      } else {
        return root.value ? Math.ceil(root.value[key]) : 0
      }
    }

    const scrollToOffset = (offset) => {
      if (props.pageMode) {
        document.body[directionKey.value] = offset
        document.documentElement[directionKey.value] = offset
      } else if (root.value) {
        root.value[directionKey.value] = offset
      }
    }

    const scrollToIndex = (index) => {
      if (index >= props.dataSources.length - 1) {
        scrollToBottom()
      } else {
        const offset = virtual.value.getOffset(index)
        scrollToOffset(offset)
      }
    }

    const scrollToBottom = () => {
      if (shepherd.value) {
        const offset = shepherd.value[isHorizontal.value ? 'offsetLeft' : 'offsetTop']
        scrollToOffset(offset)

        setTimeout(() => {
          if (getOffset() + getClientSize() + 1 < getScrollSize()) {
            scrollToBottom()
          }
        }, 3)
      }
    }

    const updatePageModeFront = () => {
      if (root.value) {
        const rect = root.value.getBoundingClientRect()
        const { defaultView } = root.value.ownerDocument
        const offsetFront = isHorizontal.value
          ? (rect.left + defaultView.pageXOffset)
          : (rect.top + defaultView.pageYOffset)
        virtual.value.updateParam('slotHeaderSize', offsetFront)
      }
    }

    const reset = () => {
      virtual.value?.destroy()
      scrollToOffset(0)
      installVirtual()
    }

    const installVirtual = () => {
      virtual.value = new Virtual({
        slotHeaderSize: 0,
        slotFooterSize: 0,
        keeps: props.keeps,
        estimateSize: props.estimateSize,
        buffer: Math.round(props.keeps / 3),
        uniqueIds: getUniqueIdFromDataSources()
      }, onRangeChanged)

      range.value = virtual.value.getRange()
    }

    const onItemResized = (id, size) => {
      virtual.value?.saveSize(id, size)
      emit('resized', id, size)
    }

    const onSlotResized = (type, size, hasInit) => {
      if (type === SLOT_TYPE.HEADER) {
        virtual.value?.updateParam('slotHeaderSize', size)
      } else if (type === SLOT_TYPE.FOOTER) {
        virtual.value?.updateParam('slotFooterSize', size)
      }

      if (hasInit) {
        virtual.value?.handleSlotSizeChange()
      }
    }

    const onRangeChanged = (newRange) => {
      range.value = newRange
    }

    const onScroll = (evt) => {
      const offset = getOffset()
      const clientSize = getClientSize()
      const scrollSize = getScrollSize()

      if (offset < 0 || (offset + clientSize > scrollSize + 1) || !scrollSize) {
        return
      }

      virtual.value?.handleScroll(offset)
      emitEvent(offset, clientSize, scrollSize, evt)
    }

    const emitEvent = (offset, clientSize, scrollSize, evt) => {
      emit('scroll', evt, virtual.value?.getRange())

      if (virtual.value?.isFront() && !!props.dataSources.length && (offset - props.topThreshold <= 0)) {
        emit('totop')
      } else if (virtual.value?.isBehind() && (offset + clientSize + props.bottomThreshold >= scrollSize)) {
        emit('tobottom')
      }
    }

    const getRenderSlots = () => {
      const renderSlots = []
      if (!range.value) return renderSlots

      const { start, end } = range.value
      const {
        dataSources,
        dataKey,
        itemClass,
        itemTag,
        itemStyle,
        extraProps,
        dataComponent,
        itemScopedSlots,
        itemClassAdd
      } = props

      const slotComponent = slots.item

      for (let index = start; index <= end; index++) {
        const dataSource = dataSources[index]
        if (dataSource) {
          const uniqueKey = typeof dataKey === 'function'
            ? dataKey(dataSource)
            : dataSource[dataKey]

          if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
            renderSlots.push(h(Item, {
              index,
              tag: itemTag,
              event: EVENT_TYPE.ITEM,
              horizontal: isHorizontal.value,
              uniqueKey,
              source: dataSource,
              extraProps,
              component: dataComponent,
              slotComponent,
              scopedSlots: itemScopedSlots,
              style: itemStyle,
              class: `${itemClass}${itemClassAdd ? ' ' + itemClassAdd(index) : ''}`
            }))
          } else {
            console.warn(`Cannot get the data-key '${dataKey}' from data-sources.`)
          }
        } else {
          console.warn(`Cannot get the index '${index}' from data-sources.`)
        }
      }
      return renderSlots
    }

    // Lifecycle hooks
    onMounted(() => {
      if (props.start) {
        scrollToIndex(props.start)
      } else if (props.offset) {
        scrollToOffset(props.offset)
      }

      if (props.pageMode) {
        updatePageModeFront()
        document.addEventListener('scroll', onScroll, { passive: false })
      }
    })

    onActivated(() => {
      scrollToOffset(virtual.value?.offset || 0)
      if (props.pageMode) {
        document.addEventListener('scroll', onScroll, { passive: false })
      }
    })

    onDeactivated(() => {
      if (props.pageMode) {
        document.removeEventListener('scroll', onScroll)
      }
    })

    onBeforeUnmount(() => {
      virtual.value?.destroy()
      if (props.pageMode) {
        document.removeEventListener('scroll', onScroll)
      }
    })

    // Watchers
    watch(() => props.dataSources.length, () => {
      virtual.value?.updateParam('uniqueIds', getUniqueIdFromDataSources())
      virtual.value?.handleDataSourcesChange()
    })

    watch(() => props.keeps, (newValue) => {
      virtual.value?.updateParam('keeps', newValue)
      virtual.value?.handleSlotSizeChange()
    })

    watch(() => props.start, (newValue) => {
      scrollToIndex(newValue)
    })

    watch(() => props.offset, (newValue) => {
      scrollToOffset(newValue)
    })

    // Initialize
    installVirtual()

    return {
      root,
      shepherd,
      range,
      isHorizontal,
      getRenderSlots,
      onScroll,
      reset,
      scrollToBottom,
      scrollToIndex,
      scrollToOffset,
      getSize,
      getSizes,
      getOffset,
      getClientSize,
      getScrollSize,
      updatePageModeFront
    }
  },

  render() {
    const {
      isHorizontal,
      pageMode,
      rootTag,
      wrapTag,
      wrapClass,
      wrapStyle,
      headerTag,
      headerClass,
      headerStyle,
      footerTag,
      footerClass,
      footerStyle
    } = this.$props

    const { header, footer } = this.$slots
    const { padFront, padBehind } = this.range || { padFront: 0, padBehind: 0 }

    const paddingStyle = {
      padding: isHorizontal
        ? `0px ${padBehind}px 0px ${padFront}px`
        : `${padFront}px 0px ${padBehind}px`
    }

    const wrapperStyle = wrapStyle
      ? Object.assign({}, wrapStyle, paddingStyle)
      : paddingStyle

    return h(rootTag, {
      ref: 'root',
      onScroll: !pageMode ? this.onScroll : null
    }, [
      header ? h(Slot, {
        class: headerClass,
        style: headerStyle,
        tag: headerTag,
        event: EVENT_TYPE.SLOT,
        uniqueKey: SLOT_TYPE.HEADER,
        onSlotResize: this.onSlotResized
      }, header()) : null,

      h(wrapTag, {
        class: wrapClass,
        role: 'group',
        style: wrapperStyle
      }, this.getRenderSlots()),

      footer ? h(Slot, {
        class: footerClass,
        style: footerStyle,
        tag: footerTag,
        event: EVENT_TYPE.SLOT,
        uniqueKey: SLOT_TYPE.FOOTER,
        onSlotResize: this.onSlotResized
      }, footer()) : null,

      h('div', {
        ref: 'shepherd',
        style: {
          width: isHorizontal ? '0px' : '100%',
          height: isHorizontal ? '100%' : '0px'
        }
      })
    ])
  }
})

export default VirtualList