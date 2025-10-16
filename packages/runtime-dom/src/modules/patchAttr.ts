export default function patchAttr(el, key, value) {
  if (value === null) {
    el.removeAttribute(key)
  } else {
    el.serAttribute[key]
  }
}

