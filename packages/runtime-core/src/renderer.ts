import { ShapeFlags } from '@vue/shared'
import { Fragment, isSameVnode, Text } from './createVnode'
import getSquence from './seq'
import { ReactiveEffect } from '@vue/reactivity'
import queueJob from './scheduler'
import { createComponentInstance, setupComponent } from './component'

//core不关心如何渲染, 可以跨平台
export function createRenderer(renderOptions) {

  const {
    insert: hostInsert,
    remove: hostremove,
    createElement:hostCreateElement,
    createText:hostCreateText,
    setText:hostSetText,
    setElementText:hostSetElementText,
    parentNode:hostParentNode,
    nextSibling:hostNextSibling,
    patchProp:hostPatchProp,
  } = renderOptions

  const mountChildren = (children, container) => {
  
    for (let i = 0; i < children.length; ++i) {
      patch(null, children[i], container)
    }
  }

  const mountElement = (vnode, container, anchor) => {
    const {type, children, props, shapeFlag} = vnode
    //第一次渲染的时候让虚拟节点和真实的dom关联, vnode.el = 真实dom
    //后面渲染时, 和前面的做比对, 更新对应el


    let el = (vnode.el = hostCreateElement(type))
    
    if(props) {
      for (let key in props) {
        //增加属性
        hostPatchProp(el, key, null, props[key])
      }
    }
    //通过按位异或来计算当前值是否存在
    //例如 9 & 8 > 0
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
  
    hostInsert(el, container, anchor)
  }

  const patchProps = (oldProps, newProps, el) => {
    //新的全部生效
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    for (let key in  oldProps) {
      if (!(key in newProps)) { //以前有现在没有
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  const unmountChildren = (children) => {

    for(let i = 0; i < children.length; i++) {
      let child = children[i]
      unmount(child)
    } 
  }

  const patchKeyedChildren = (c1, c2, el) => {
    //比较两个儿子的差异更新
    //在头尾部增加两个指针, 从头开始比, 再从为比, 确实不一样的范围
    //如果有不同的直接操作

    let i = 0 //头指针, 开始的索引
    let e1 = c1.length - 1 //尾指针, 第一个数组的尾部索引
    let e2 = c2.length - 1 //第二个数组的尾部
    // debugger
    while(i <= e1 && i <= e2) {//超出就结束
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnode(n1, n2)) {
        //更新当前的节点的属性何儿子
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }

    while(i <= e1 && i <= e2) {//超出就结束
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnode(n1, n2)) {
        //更新当前的节点的属性何儿子
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }

    if (i > e1) { //新的多
      if ((i <= e2)) { //有插入的部分

        let nextPos = e2 + 1

        let anchor = c2[nextPos]?.el //锚点
        
        while(i <= e2) {
          patch(null, c2[i], el, anchor)
          ++i
        }
      }
    } else if (i > e2) { //老的多
        while(i <= e1) { //把老的都删除
          if(Array.isArray(c1[i])) {
            unmountChildren(c1[i])
          } else {
            unmount(c1[i])
          } 
          ++i
        }
    } else { //中间比对
      //做一个映射表, 老比对
      let s1 = i
      let s2 = i

      const keyToNewIndexMap = new Map()
      let toBePatched = e2 - s2 + 1 //倒叙插入的个数
      //创建一个长度等于toBePatched的数组, 用来标记标记是否被标记
      let newIndexToOldIndex = new Array(toBePatched).fill(0)

      for (let i = s2; i <= e2; ++i) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }
      for (let i = s1; i <= e1; ++i) {
        const vnode = c1[i]
        const newIndex = keyToNewIndexMap.get(vnode.key)//通过key找索引
        
        if(newIndex === undefined) {
          //新的里面找不到, 就删除
          unmount(vnode)
        } else {
          // console.log(newIndex - s2, i + 1)
          newIndexToOldIndex[newIndex - s2] = i + 1 
          //避免出现0的情况, 保证0是没有比对的情况
          //比较前后节点的差异, 更新属性和儿子
          patch(vnode, c2[newIndex], el)
        }
      }
      // console.log(newIndexToOldIndex, '---')
      //调整顺序
      //按照新的队列, 倒序插入(通过insertBefore把原来的元素往后移)

      //插入过程中, 创建没有的元素
     
      //最长递增子序列
      let increasingSeq = getSquence(newIndexToOldIndex)
     let j = increasingSeq.length - 1

      for (let i = toBePatched - 1; i >= 0; --i) {
        let nextIndex = s2 + i //h的索引, 找下一个元素作为参照物
        let anchor = c2[nextIndex + 1]?.el
        let vnode = c2[nextIndex]

        if (!vnode.el) {
          patch(null, vnode, el, anchor)
         } else {
          if (i == increasingSeq[j]) {
            j--
          }else {
            hostInsert(vnode.el, el, anchor)
          }
        }
      }
    }
  }

  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children

    const preShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag
    //新旧文本有文本和数组两种类型, 判断是那种情况

    //1.新的是文本，老的是数组移除老的：
    //2.新的是文本，老的也是文本，内容不相同替换
    //3.老的是数组，新的是数组，diff算法对比更新
    //4.老的是数组，新的不是数组，移除老的子节点
    //5.老的是文本，新的是空
    //6.老的是文本，新的是数组

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { //新的是文本 
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //老的是数组, 新的是文本
        unmountChildren(c1)
      }   
       //新老都是文本, 直接修改
      if (c1 !== c2) {
        hostSetElementText(el, c2) //注意是文本
      }
     
    } else {//新的是数组或空
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //新老都是数组
        //diff算法, 新老对比
        patchKeyedChildren(c1, c2, el)

      } else {
        //老是文本
        if(preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')//清空文本
        }
        //新不是空
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el) //挂载新数组
        }
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    // debugger
    //比较差异, 复用dom元素
    let el = n2.el = n1.el

    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    //hostPatchProp 只针对某一个属性来处理
    patchProps(oldProps, newProps, el)
    patchChildren(n1, n2, el)
  }

  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) { //第一次挂载, 初始化
      mountElement(n2, container, anchor)
    } else {
      //对旧节点的复用
      patchElement(n1, n2, container)
    }
  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert(
        n2.el = hostCreateText(n2.children),
        container
      )
    } else {
      const el = n2.e = n1.el
      if(n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container)
    } else {
      patchChildren(n1, n2, container)
    }
  }

  function setupRenderEffect(instance, container, anchor) {
    const { render } = instance
    
    const componentUpdateFn = () => {
      const subTree = render.call(instance.proxy, instance.proxy)
      //区分挂载状态
      if (!instance.isMounted) {
        instance.subTree = subTree
        patch(null, subTree, container, anchor)
        instance.isMounted = true
        instance.subTree = subTree
      } else {
        //基于状态的组件更新
        patch(instance.subTree, subTree, container, anchor)
        instance.subTree = subTree
      }
    }

    const effect = 
      new ReactiveEffect(
        componentUpdateFn, 
        () => queueJob(update)
      )
   
    const update = (instance.update = () => effect.run())
    
    update()
  }

  const mountComponent = (vnode, container, anchor) => {
    //1.先创建组件实例, 并放在虚拟节点上
    //2.给实例的属性赋值
    //3.创建一个effect
    const instance = 
    (vnode.component = createComponentInstance(vnode))

    setupComponent(instance)

    setupRenderEffect(instance, container, anchor)

  }

  const processComponent = (n1, n2, container, anchor) => {

    if (n1 === null) {
      debugger
      mountComponent(n2, container, anchor)
    } else {
      //组件更新
      debugger
      n1.props.address = '2'
    }

  }

  const patch = (n1, n2, container, anchor = null) => {
    // console.log('2')
    if(n1 === n2) { 
      //两次渲染同一个元素直接跳过
      return
    }
    //移除老的, 删除新的
    if (n1 && !isSameVnode(n1, n2)) {
     unmount(n1)
     n1 = null //重新挂载新的
    }
    // debugger
    const {type, shapeFlag} = n2
    switch(type) {
      case Text: 
        processText(n1, n2, container)
      break
      case Fragment:
        processFragment(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor) //对元素处理
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          //对组件的处理
          //Vue3中函数式组件已经废弃了, 没有性能节约
          processComponent(n1, n2, container, anchor)
        }
        
    }
  }

  const unmount = (vnode) => {
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children)
    } else {
      hostremove(vnode.el)
    }
  }
  //多次调用render, 会进行虚拟节点的比较, 进行更新
  const render = (vnode, container) => {
    //将虚拟节点变成真实节点进行渲染

    if (vnode === null) {//移除虚拟节点
      // if(container._vnode) 
        if (container._vnode) {
          unmount(container._vnode)
        }
    } else {
      patch(container._vnode || null, vnode, container)
      //将这次渲染的节点存下来, 便于下次修改
      container._vnode = vnode
    }
  }
  return {
    render
  }
}