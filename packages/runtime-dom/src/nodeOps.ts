//对节点元素的增删查改

export const nodeOps = {
  insert: (el, parent, anchor) =>
    parent.insertBefore(el, anchor || null),
  
  remove(el) {
    //移除dom元素
    const parent = el.parentNode
    if (parent) parent.removeChild(el)
  },
  createElement: type => document.createElement(type),
  createText: text => document.createTextNode(text),
  setText: (node, text) => node.nodeValue = text,
  setElementText: (el, text) => {
    el.textContent = text
  },
  parentNode: (node) => node.parentNode,
  nextSibling: (node) => node.nextSibling
}
