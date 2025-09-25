import { ItemProps, SlotProps } from './props'
import { h, defineComponent, onMounted, onUpdated, onBeforeUnmount, ref } from 'vue'

/**
 * item and slot component both use similar wrapper
 * we need to know their size change at any time
 */

const useSizeObserver = (props, emit) => {
  const shapeKey = ref(props.horizontal ? 'offsetWidth' : 'offsetHeight')
  const resizeObserver = ref(null)
  const element = ref(null)

  const getCurrentSize = () => {
    return element.value ? element.value[shapeKey.value] : 0
  }

  const dispatchSizeChange = () => {
    emit(props.event, props.uniqueKey, getCurrentSize(), props.hasInitial)
  }

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver.value = new ResizeObserver(() => {
        dispatchSizeChange()
      })
      if (element.value) {
        resizeObserver.value.observe(element.value)
      }
    }
  })

  onUpdated(() => {
    if (resizeObserver.value && element.value) {
      resizeObserver.value.observe(element.value)
    }
  })

  onBeforeUnmount(() => {
    if (resizeObserver.value) {
      resizeObserver.value.disconnect()
      resizeObserver.value = null
    }
  })

  return {
    element,
    getCurrentSize,
    dispatchSizeChange
  }
}

// wrapping for item
export const Item = defineComponent({
  name: 'VirtualListItem',

  props: {
    ...ItemProps,
    // In Vue 3, props need to be explicitly defined
    tag: {
      type: String,
      default: 'div'
    },
    horizontal: Boolean,
    uniqueKey: [String, Number],
    event: String,
    hasInitial: Boolean,
    component: [String, Object],
    extraProps: Object,
    index: Number,
    source: [Object, Number, String],
    scopedSlots: Object,
    slotComponent: Function
  },

  emits: ['item-size-change'], // Declare emitted events

  setup(props, { emit }) {
    const { element } = useSizeObserver(props, emit)
    return { element }
  },

  render() {
    const { tag, component, extraProps = {}, index, source, uniqueKey, slotComponent } = this
    const props = {
      ...extraProps,
      source,
      index
    }

    return h(tag, {
      key: uniqueKey,
      ref: 'element',
      role: 'listitem'
    }, [
      this.slotComponent
        ? this.slotComponent({ item: source, index: index, scope: props })
        : h(component, props, this.$slots.default)
    ])
  }
})

// wrapping for slot
export const Slot = defineComponent({
  name: 'VirtualListSlot',

  props: {
    ...SlotProps,
    // In Vue 3, props need to be explicitly defined
    tag: {
      type: String,
      default: 'div'
    },
    horizontal: Boolean,
    uniqueKey: [String, Number],
    event: String,
    hasInitial: Boolean
  },

  emits: ['slot-size-change'], // Declare emitted events

  setup(props, { emit }) {
    const { element } = useSizeObserver(props, emit)
    return { element }
  },

  render() {
    const { tag, uniqueKey } = this

    return h(tag, {
      key: uniqueKey,
      ref: 'element',
      role: uniqueKey
    }, this.$slots.default?.())
  }
})