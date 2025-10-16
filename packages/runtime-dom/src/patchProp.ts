//对节点元素的属性操作 class style event

import patchAttr from './modules/patchAttr'
import patchClass from './modules/patchClass'
import patchEvent from './modules/patchEvent'
import patchStyle from './modules/patchStyle'


export default function patchProp(el, key, preValue, nextValue) {

  if (key === 'class') {
    return patchClass(el, nextValue)
  } else if (key === 'style') {
    return patchStyle(el, preValue, nextValue )
  } else if (/^on[^a-z]/.test(key)) { //事件名称为onClick这类, "on"开头加大写字母
    return patchEvent(el, key, nextValue)
  } else {
    return patchAttr(el, key, nextValue)
  }

}

