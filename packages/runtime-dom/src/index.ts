export * from "@vue/reactivity"
export * from "@vue/shared"

import {nodeOps} from './nodeOps'
import patchProp from './patchProp'

//将节点操作和属性操作结合在一起
const renderOptions = Object.assign({patchProp}, nodeOps)
function createRenderer() {

}

// createRenderer(renderOptions).render()

