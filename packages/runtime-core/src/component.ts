import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"

export  function createComponentInstance(vnode) {

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
  }
  return instance
}

const publicProperty = {
  $attrs: (instance) => instance.attrs,
}

const handler = {
  get(target, key) {

    const {data, props} = target
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
        return props[key]
    }
    const getter = publicProperty[key] 
    //通过不同的策略来访问对应的方法
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const {data, props} = target
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      // props[key] = value
        console.log("cant't set props")
        return false
    }
    return true
  }
}

export function setupComponent(instance) {

  const { vnode } = instance
  //赋值属性
  initProps(instance, vnode.props)
  //赋值代理对象
  instance.proxy = new Proxy(instance, handler)

  const { data = () => {}, render } = vnode.type
  // console.log(data)

    if (!isFunction(data)) {
      console.warn("data option must be a function")
    } else {
      //data中可以拿到props
      instance.data = reactive(data.call(instance.proxy))
      // console.log(instance.data, 'data')
    }

  instance.render = render
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
