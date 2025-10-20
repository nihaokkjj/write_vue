export default function patchStyle(el, preValue, nextValue) {
  let style = el.style
  if (nextValue) {
    for (let key in nextValue) {
      style[key] = nextValue[key] //新样式全部生效
    }
  }

  if (preValue) {
    for(let key in preValue) {
      //看以前的属性现在有没有, 如果没有就删掉
      if(!nextValue || nextValue[key] === null) {
        style[key] = null
      }
    }
  }
}