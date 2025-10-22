//创建调用器, 减少绑定和解绑次数
function createInvoker(value) {
  const invoker = (e) => invoker.value(e)
  invoker.value = value
}

export default function patchEvent(el, name, nextValue) {

  //取缓存
  const invokers = el._vei || (el._vei = {})
  //去除前缀"on"
  const eventName = name.slice(2).toLowerCase()

  //判断是否存在旧值
  const exisitingInvokers = invokers[name]
  //如果之前存在这个方法, 只需换绑, 减少解绑次数
  if(nextValue && exisitingInvokers) {
    return (exisitingInvokers.value = nextValue)
  }
//之前没有存在过
  if (nextValue) {
    const invoker = (invokers[name] = createInvoker(nextValue))
    console.log(el.addEventListener(eventName, invoker))
    debugger

    return el.addEventListener(eventName, invoker)
  }
  //以前有现在没有
  if (exisitingInvokers) {
    el.removeEventListener(eventName, exisitingInvokers)
    invokers[name] = undefined
  }
}