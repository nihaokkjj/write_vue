import { ShapeFlags } from '@vue/shared'
import { isSameVnode } from './createVnode'

//core不关心如何渲染, 可以跨平台
export function createRenderer(renderOptions) {

  const {
    insert: hostInsert,
    remove: hostremove,
    createElement:hostCreateElement,
    createText:hostCreateText,
    setText:hostSetText,
    setElementText:hostSetElementText,
    parentNode:hostParentNode,
    nextSibling:hostNextSibling,
    patchProp:hostPatchProp,
  } = renderOptions

  const mountChildren = (children, container) => {
  
    for (let i = 0; i < children.length; ++i) {
      patch(null, children[i], container)
    }
  }

  const mountElement = (vnode, container) => {
    const {type, children, props, shapeFlag} = vnode
    //第一次渲染的时候让虚拟节点和真实的dom关联, vnode.el = 真实dom
    //后面渲染时, 和前面的做比对, 更新对应el

    let el = (vnode.el = hostCreateElement(type))

    if(props) {
      for (let key in props) {
        //增加属性
        hostPatchProp(el, key, null, props[key])
      }
    }
    //通过按位异或来计算当前值是否存在
    //例如 9 & 8 > 0
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, container)
    }
  
    hostInsert(el, container)
  }

  const patchProps = (oldProps, newProps, el) => {
    //新的全部生效
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    for (let key in  oldProps) {
      if (!(key in newProps)) {
        hostremove()
      }
    }
  }
  const patchChildren = (n1, n2, container) {
    debugger
  }

  const patchElement = (n1, n2, container) => {
    // debugger
    //比较差异, 复用dom元素
    let el = n2.el = n1.el

    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    //hostPatchProp 只针对某一个属性来处理
    patchProps(oldProps, newProps, el)
    patchChildren(n1, n1, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 === null) { //第一次挂载, 初始化
      mountElement(n2, container)
    } else {
      //对旧节点的复用
      patchElement(n1, n2, container)
    }
  }

  const patch = (n1, n2, container) => {
    // console.log('n1',n1,'n2', n2)
    if(n1 === n2) { 
      //两次渲染同一个元素直接跳过
      return
    }
    //移除老的, 删除新的
    if (n1 && !isSameVnode(n1, n2)) {
     unmount(n1)
     n1 = null //重新挂载新的
    }
    processElement(n1, n2, container) //对元素处理
  }

  const unmount = (vnode) => {
    hostremove(vnode.el)
  }
  //多次调用render, 会进行虚拟节点的比较, 进行更新
  const render = (vnode, container) => {
    //将虚拟节点变成真实节点进行渲染

    if (vnode === null) {//移除虚拟节点
      // if(container._vnode) 
        if (container._vnode) {
          unmount(container._vnode)
        }
    }
    patch(container._vnode || null, vnode, container)

    //将这次渲染的节点存下来, 便于下次修改
    container._vnode = vnode
  }
  return {
    render
  }
}