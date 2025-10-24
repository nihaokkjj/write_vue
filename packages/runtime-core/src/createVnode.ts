import { isObject, isString, ShapeFlags} from '@vue/shared'

export const Text = Symbol('Text')
export const Fragment = Symbol("Fragment")


export function isVnode(value) {
  return value?.__v_isVnode
}

//没有提供key就都是undefined
export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

export function createVnode(type, props, children?) {
  const shapeFlag = 
  isString(type) ? ShapeFlags.ELEMENT : 
  isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0
  
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key, //diff算法后面需要key
    el: null, //虚拟节点需要对应的真实节点是谁
    shapeFlag
  }

  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN //插槽
    } else {
      children = String(children)
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }
  }
  return vnode
}