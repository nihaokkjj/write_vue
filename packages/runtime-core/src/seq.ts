export default function getSquence(arr) {
  // 最长递增子序列（基于索引），用于 keyed diff 的最少移动优化
  let result = [0] // 存放的是索引（index），不是值
  const len = arr.length
  const p = new Array(len) // 记录每个位置的前驱索引

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) { // 0 表示该位置是需要新创建的节点
      // 与当前 LIS 尾部比较（注意 result 存的是索引）
      const lastIndex = result[result.length - 1]
      if (arrI > arr[lastIndex]) {
        p[i] = lastIndex
        result.push(i)
      } else {
        // 二分查找在 result 中第一个 >= arrI 的位置
        let left = 0
        let right = result.length - 1
        let middle = 0
        while (left < right) {
          middle = Math.floor((left + right) / 2)
          if (arr[result[middle]] < arrI) left = middle + 1
          else right = middle
        }
        // 覆盖并记录前驱
        if (arrI < arr[result[left]]) {
          if (left > 0) p[i] = result[left - 1]
          result[left] = i
        }
      }
    }
  }

  // 回溯前驱，构造索引序列
  let l = result.length
  let last = result[l - 1]
  while (l-- > 0) {
    result[l] = last
    last = p[last]
  }
  return result
}
//根据前驱节点找出最长的子序列, 因为最后一项不会错误,
//从而找出完整正确的子序列
