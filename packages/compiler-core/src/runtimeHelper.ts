import { NodeTypes } from "./ast"

export const TO_DISPLAY_STRING = Symbol('TO_DISPLAY_STRING')
export const CREATE_TEXT_VNODE = Symbol('CREATE_TEXT_VNODE')
export const CREATE_ELEMENT_VNODE = Symbol('CREATE_ELEMENT_VNODE')

// 通过名字做一个映射
export const helperMap = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT_VNODE]: 'createTextVNode',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
}

export function createCallExpression(context, args) {
  let name = context.helper(CREATE_TEXT_VNODE)
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    arguments: args,
    callee: name,
  }

}

export function createVnodeCall(context, tag, props, children) { 
  context.helper(CREATE_ELEMENT_VNODE)

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
  }
}
