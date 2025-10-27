

import { h } from "../h"

//保证起点动画在至少执行一帧后再移除
function nextFram(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}

export function resolveTranstionProps(props) {
  const { 
    name = 'v', 
    enterFromClass = `${name}-enter-from`,
    enterActiveCalss = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveCalss = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = props

  return {
    //上面props里结构的时用户传入的
    //return的是自定义的
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter()
      el.classList.add(enterFromClass)
      el.classList.add(enterActiveCalss)
    },
    onEnter(el, done) {

      //结束时调用resolve
      const resolve = () => {
        el.classList.remove(enterToClass)
        el.classList.remove(enterActiveCalss)
        el.removeEventListener("transitionend", resolve) // 移除监听器
        done && done()
      }
      onEnter && onEnter(el, resolve)

      nextFram(() => { //保证动画的产生
        //添加后, 再移除, 而不是马上移除
        el.classList.remove(enterFromClass)
        el.classList.add(enterToClass)
        //如果用户没有传入onEnter, 或者没有传入done
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener("transitionend", resolve)
        }
      })
    },
    onLeave(el, done) {
      //结束时调用resolve
      const resolve = () => {
        el.classList.remove(leaveActiveCalss)
        el.classList.remove(leaveToClass)
        el.removeEventListener("transitionend", resolve) //移除监听器
        done && done()
      }
      onLeave && onLeave(el, resolve)

      el.classList.add(leaveFromClass)

      document.body.offsetHeight //强制浏览器重绘

      el.classList.add(leaveActiveCalss)

      nextFram(() => {
        el.classList.remove(leaveFromClass)
        el.classList.add(leaveToClass)

        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener("transitionend", resolve)
        }
      })
    }
  }

}

export function Transition(props, {slots}) {
 
  return h(
    BaseTranstionImple, 
    resolveTranstionProps(props),
    slots
  )

}


//真正的组件 只需要渲染的时候调用封装后的钩子
const BaseTranstionImple = {
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function,
  },
  setup(props, {slots}) {
    
    return () => {
      const vnode = slots.default && slots.default()

      if (!vnode) {
        return 
      }
      //渲染前
      // const oldVnode = instance.subTree 
      // //之前的虚拟节点
  
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave,
      }
      return vnode
    }
  },

}












