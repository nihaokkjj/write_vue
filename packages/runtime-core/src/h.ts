
import {isObject} from '@vue/shared'
import { createVnode, isVnode} from './createVnode'
//h(类型, 属性, 儿子)
//h(类型, 儿子)
//1.两个参数第二个参数可能是属性，或
//者虚拟节点(v_isVnode)
//2.第二个参数就是一个数组->儿子
//3.其他情况就是属性
//4.直接传递非对象的，文本
//5.不能出现三个参数的时候第二个只能是
//属性，
//6,如果超过三个参数，后面的都是儿子

export function h
(type, propsOrChildren?, children?) {
  let l = arguments.length //参数的总个数

  if(l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
        //是对象但不是数组, 说明是 h(h1, 虚拟节点|属性)
      if (isVnode(propsOrChildren)) {
        //是虚拟节点
        return createVnode(type, null, [propsOrChildren])
      }  else {//是属性
        return createVnode(type, propsOrChildren)
      }
    }
    //儿子 是数组 | 文本
    return createVnode(type, null, propsOrChildren)
  } else {
    if(l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
      // children = Array.from(arguments).slice(2)
    } 
    if (l === 3 && isVnode(children)) { //只有一个儿子
      children = [children]
    }
    //l = 3 || l = 1
    return createVnode(type, propsOrChildren, children)
  }
}


