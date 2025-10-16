import {} from '@vue/reactivity'
import { ShapeFlags } from '@vue/shared'

export * from '@vue/reactivity'
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
    const {type, children, props, shapeFlags} = vnode

    let el = hostCreateElement(type)

    if(props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    if (shapeFlags & shapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
  
    hostInsert(el, container)
  }

  const patch = (n1, n2, container) => {
    if(n1 === n2) { //两次渲染同一个元素直接跳过
      return
    }
    if (n1 === null) { //第一次挂载, 初始化
      mountElement(n2, container)
    }
  }

  //多次调用render, 会进行虚拟节点的比较, 进行更新
  const render = (vnode, container) => {
    //将虚拟节点编程真实节点进行渲染

    patch(container._vnode || null, vnode, container)

    //将这次渲染的节点存下来, 便于下次修改
    container._vnode = vnode
  }
  return {
    render
  }
}
