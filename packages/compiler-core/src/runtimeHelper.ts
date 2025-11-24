export const TO_DISPLAY_STRING = Symbol('TO_DISPLAY_STRING')
export const CREATE_TEXT_VNODE = Symbol('CREATE_TEXT_VNODE')

// 通过名字做一个映射
export const helperMap = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT_VNODE]: 'createTextVNode',
}
