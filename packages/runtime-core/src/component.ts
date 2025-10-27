import { proxyRefs, reactive } from "@vue/reactivity"
import { hasOwn, isFunction, ShapeFlags } from "@vue/shared"
import { onMounted } from "./apiLifecycle"

export  function createComponentInstance(vnode, parent) {

  const instance = {
    data: null, //状态
    vnode, //组件的虚拟节点
    subTree: null, //子树
    isMounted: false, // 是否挂载完成
    update: null ,//组件的更新的函数
    props: {}, //响应式, 方便开发
    attrs: {}, //
    propsOptions: vnode.type.props, 
    //用户声明的哪些属性是组件的属性
    component: null,
    proxy: null, //代理attrs, props, data, 方便使用
    setupState: {}  ,
    slots: {},
    exposed: null,
    parent,
    provides: parent ? parent.provides : Object.create(null)
  }
  return instance
  
}

const publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots,
}

const handler = {
  get(target, key) {

    const {data, props, setupState} = target
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
        return props[key]
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key]
    }

    const getter = publicProperty[key] 
    //通过不同的策略来访问对应的方法
    if (getter) {
      return getter(target)
    }
  },

  set(target, key, value) {
    const {data, props, setupState} = target
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
        console.log("cant't set props")
        return false
    } else if (setupState && hasOwn(setupState, key)) {
       setupState[key] = value
    }
    return true
  }
}

export function initSlots(instance, children) {

  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children
  } else {
    instance.slots = {}
  }

}
export function setupComponent(instance) {

  const { vnode } = instance
  //赋值属性
  initProps(instance, vnode.props)
  //赋值插槽
  initSlots(instance, vnode.children)
  // debugger
  //赋值代理对象
  instance.proxy = new Proxy(instance, handler)

  const { data = () => {}, render, setup} = vnode.type
    // console.log(setup)
    // debugger
  if (setup) {

    const setupContext = {

      slots: instance.slots,
      attrs: instance.attrs,
      expose(value) {

        instance.exposed = value
      },
      emit(event, ...payload) {
        //将事件名第一个字母转成大写
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
        
        const handler = instance.vnode.props[eventName]

        handler && handler(...payload)
      }
    }

    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    unsetCurrentInstance()

    
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else {
      //将返回的值做脱ref
      instance.setupState = proxyRefs(setupResult)
    }
  }

    if (!isFunction(data)) {
      console.warn("data option must be a function")
    } else {
      //data中可以拿到props
      instance.data = reactive(data.call(instance.proxy))
      // console.log(instance.data, 'data')
    }
    if(!instance.render) {
      instance.render = render
    }
}

//初始化
const initProps = (instance, rawProps) => {

  const props = {}
  const attrs = {}
  const propsOptions = instance.propsOptions || {}

  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = reactive(value) //props不需要深度解构, 组件不能更改props
      } else {
        attrs[key] = value
      }
    }
  }
  instance.attrs = attrs
  instance.props = reactive(props)
}

export let currentInstance = null
export const getCurrentInstance = () => {
  return currentInstance
}

export const setCurrentInstance = (instance) => {
  currentInstance = instance
}

export const unsetCurrentInstance = () => {
  currentInstance = null
}