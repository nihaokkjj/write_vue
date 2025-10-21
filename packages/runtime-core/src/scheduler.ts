
const queue = [] //缓存当前要执行的队列

let isFlushing = false
const resolvePromise = Promise.resolve()

//如果在一个状态中跟新多个状态, job为同一个
//同时开启一个异步任务
export default function queueJob (job) {
  // console.log(job, 'job')
  if (!queue.includes(job)) { //去重
    queue.push(job) //让任务入队列
  }

  if(!isFlushing) {
    isFlushing = true

   resolvePromise.then(() => {
    isFlushing =  false
    const copy = queue.slice(0) //先拷贝再执行
    queue.length = 0
    copy.forEach(job => job())
    copy.length = 0
    })
  }
}

//通过事件环的机制, 延迟更新操作, 
// 先执行同步任务,在执行微任务
