import { nodeOps } from './nodeOps'
import patchProp from './patchProp'
import { createRenderer } from '@vue/runtime-core'

export * from '@vue/shared'

//将节点操作和属性操作结合在一起
const renderOptions = Object.assign({ patchProp }, nodeOps)

export const render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container)
}
export * from '@vue/runtime-core'


