import { currentInstance } from "./component";

export function provide(key, value) {

    //子用的是父, 子提供了顺序
   //子提供新属性时, 应该拷贝后在添加, 不能改变父的属性

   if (!currentInstance) return //没有建立在组件的基础上

   //获取父组件的provide
   const parentProvide = currentInstance.parent?.provides

   let provides = currentInstance.provides //当前实例的provide

   //只有第一次进来才能拷贝, 后面的对象将不相同
   if (parentProvide === provides) {
    //如果新增, 则在拷贝后的对象上新增
    provides = currentInstance.provides = Object.create(provide)
   }

    provides[key] = value   
}

export function inject(key, defaultValue) {

  if (!currentInstance) return

  const provides = currentInstance.parent?.provides
  if (provides && key in provides) {
    return provides[key]
  } else {
    return defaultValue //返回默认inject
  }

}








