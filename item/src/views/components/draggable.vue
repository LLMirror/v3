<template>
  <div class="draggable-box">
    <div class="flex">
      <div class="flex-left">
        <div class="left-title">功能区</div>
        <Draggable
            :list="functionalList"
            :force-fallback="true"
            :sort="false"
            item-key="type"
            animation="300"
            :group="{name:'myGroup',pull:'clone',put:false}"
            @start="markShow=false"
        >
          <template #item="{element,index}">
            <div class="value-box">
              <div class="value-item" v-show="element.type===1">
                <el-input readonly :placeholder="element.placeholder" />
              </div>
              <div class="value-item" v-show="element.type===2">
                <div class="value-carousel">轮播图</div>
              </div>
              <div class="value-item" v-show="element.type===3">
                <div class="value-class">
                  <div>小分类1</div>
                  <div>小分类2</div>
                  <div>小分类3</div>
                  <div>小分类4</div>
                </div>
              </div>
              <div class="value-item" v-show="element.type===4">
                <div class="value-list">
                  <div>长列表1</div>
                  <div>长列表2</div>
                  <div>长列表3</div>
                </div>
              </div>
            </div>
          </template>
        </Draggable>
      </div>
      <div class="flex-center">
        <div class="center-title">效果区</div>
        <div class="edit-box">
          <div class="edit-mark" v-if="markShow">请从左边功能区拖拽到此编辑</div>
          <Draggable
              :list="editList"
              :force-fallback="true"
              :sort="true"
              item-key="type"
              animation="300"
              :group="{name:'myGroup',pull:false,put:true}"
              @choose="editChoose"
              @add="editAdd"
              style="height: 600px"
          >
            <template #item="{element,index}">
              <div class="value-box">
                <el-icon class="value-close" @click="editClose(index)" title="删除"><Close /></el-icon>
                <div class="value-item" v-show="element.type===1">
                  <el-input readonly :placeholder="element.placeholder" />
                </div>
                <div class="value-item" v-show="element.type===2">
                  <div class="value-carousel">轮播图：{{element.carouselNum}}张</div>
                </div>
                <div class="value-item" v-show="element.type===3">
                  <div class="value-class">
                    <div v-for="(item,index) in element.classList" :key="index" :class="{'no-margin':index%4===0}">小分类{{index+1}}</div>
                  </div>
                </div>
                <div class="value-item" v-show="element.type===4">
                  <div class="value-list">
                    <div>长列表1</div>
                    <div>长列表2</div>
                    <div>长列表3</div>
                  </div>
                </div>
              </div>
            </template>
          </Draggable>
        </div>
      </div>
      <div class="flex-right">
        <div class="right-title">功能编辑区</div>
        <div class="right-input-placeholder" v-show="editItem.type===1">
          <span>输入框占位符</span>
          <hr>
          <el-input v-model="rightValue.placeholder" @input="inputChange" placeholder="搜索输入框占位符文字编辑" />
        </div>
        <div class="right-carousel" v-show="editItem.type===2">
          <span>轮播图张数</span>
          <hr>
          <el-input-number v-model="rightValue.carouselNum" :min="1" @change="carouselChange" />
        </div>
        <div class="right-class" v-show="editItem.type===3">
          <span>小分类数量</span>
          <hr>
          <el-input-number v-model="rightValue.classNum" :min="1" @change="classNumChange" />
          <div class="right-class-item" v-for="(item,index) in rightValue.classList" :key="index">
            <div>分类《{{index+1}}》跳转</div>
            <el-input v-model="item.path" placeholder="请输入小分类的跳转地址"  />
          </div>
        </div>
        <div class="right-list" v-show="editItem.type===4">
          长列表就不做编辑了，需要的可以自己加
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="Draggable">
  //https://www.itxst.com/vue-draggable-next/tutorial.html
  import Draggable from "vuedraggable";
  import {deepClone} from "@/utils/index.js";
  // 功能区默认数据，根据type来区分
  const functionalList=ref([
    {name:'输入框',type:1,placeholder:"搜索输入框占位符"},
    {name:'轮播图',type:2,carouselNum:1},
    {name:'小分类',type:3,classList:[{},{},{},{}],classNum:4},
    {name:'长列表',type:4},
  ])
  // 效果区数据
  const editList=ref([])
  const markShow=ref(true);
  // 当前选中的编辑项下标和type
  const editItem=reactive({
    index:null,
    type:null,
  })
  // 编辑项的值
  const rightValue=ref({})
  function editChoose({oldIndex,newItem}){
    editItem.index=oldIndex;
    editItem.type=editList.value[oldIndex].type;
    // 如果是新拖拽的，重置默认值。反之拿已经存在的
    if(newItem){
      rightValue.value={
        placeholder:"",
        carouselNum: 1,
        classNum: 4,
        classList: [{},{},{},{}],
      }
    }else rightValue.value=editList.value[oldIndex];
  }
  function editAdd({newIndex}) {
    editChoose({oldIndex:newIndex,newItem:true});
    editList.value=deepClone(editList.value);
  }
  function editClose(index) {
    editList.value.splice(index,1);
    editItem.type=editItem.index=null;
  }
  function inputChange(val){
    editList.value[editItem.index].placeholder=val;
  }
  function carouselChange(val){
    editList.value[editItem.index].carouselNum=val;
  }
  // 小分类的新增和删除
  function classNumChange(val){
    if(val>rightValue.value.classList.length){
      rightValue.value.classList.push({})
    }else{
      rightValue.value.classList.splice(val,1)
    }
    editList.value[editItem.index].classList=deepClone(rightValue.value.classList);
  }
</script>

<style scoped lang="scss">
  //  隐藏滚动条
  .edit-box::-webkit-scrollbar {
    display: none !important;  /* for WebKit browsers */
  }
  .draggable-box{
    width: 1200px;
    margin: 10px auto;
    border: 1px solid #dedede;
  }
  .flex {
    display: flex;
    justify-content: space-between;
    .flex-left {
      min-width: 375px;
      padding: 10px;
      .left-title{
        text-align: center;
      }
    }
    .flex-center{
      width: 100%;
      border-left: 2px solid #a9a9a9;
      border-right: 2px solid #a9a9a9;
      //display: flex;
      //justify-content: center;
      padding-top: 10px;
      .center-title{
        text-align: center;
      }
      .edit-box{
        width: 375px;
        height: 667px;
        border: 1px solid #d3d3d3;
        box-shadow: 0 0 0 5px #ececec;
        border-radius: 10px;
        margin: 10px auto;
        padding: 10px;
        overflow-y: auto;
        position: relative;

        .edit-mark{
          color: #666;
          width: 100%;
          height: 500px;
          line-height: 500px;
          text-align: center;
          position: absolute;
          top: 0;
          left: 0;
        }
        .value-item{
          border: none;
          padding: 0;
          &:first-child{
            margin-top: 0;
          }
        }
        .value-class{
          justify-content: left;
          margin-top: -10px;
          div{
            margin: 10px 0 0 10px;
          }
          .no-margin{
            margin-left: 0;
          }
        }
      }
    }
    .flex-right{
      min-width: 375px;
      height: 667px;
      padding: 10px;
      overflow-y: auto;
      .right-title{
        text-align: center;
      }
      .right-input-placeholder,.right-carousel,.right-class{
        padding: 20px;
        span{
          font-size: 14px;
        }
      }
      .right-class-item{
        font-size: 12px;
        margin: 15px 10px;
        div{
          margin-bottom: 5px;
        }
      }
      .right-list{
        font-size: 14px;
        color: #d00202;
        text-align: center;
        margin-top: 100px;
      }
    }
  }

  .value-box{
    position: relative;
    &:hover{
      .value-close{
        display: block;
      }

    }
    .value-close{
      position: absolute;
      top: 0px;
      right: 0px;
      z-index: 99;
      cursor: pointer;
      display: none;
    }
    .value-item{
      border: 1px dashed #f53559;
      padding: 8px;
      border-radius: 3px;
      margin-top: 10px;
      cursor: pointer;

    }
    .value-carousel{
      width: 100%;
      height: 100px;
      background: #eaeaea;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .value-class{
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: space-between;
      div{
        font-size: 12px;
        color: #fff;
        text-align: center;

        width: 80px;
        min-width: 80px;
        height: 70px;
        line-height: 70px;
        border-radius: 3px;
        background: #5990a4;
      }

    }
    .value-list{
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      div{
        color: #fff;
        text-align: center;
        min-width: 160px;
        height: 180px;
        line-height: 190px;
        background: #647ccc;
        margin-bottom: 10px;
      }
    }
  }
</style>
