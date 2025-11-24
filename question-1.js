function getSquemce(arr) {
  // 最长递增子序列（索引版本）
  let result = [0]
  let len = arr.length
  const p = new Array(len)

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      // 最末索引 vs 值
      const lastIndex = result[result.length - 1]
      if (arrI > arr[lastIndex]) {
        p[i] = lastIndex
        result.push(i)
      } else {
        let left = 0
        let right = result.length - 1
        let middle = 0

        while (left < right) {
          middle = Math.floor((left + right) / 2)
          if (arr[result[middle]] < arrI) {
            left = middle + 1
          } else {
            right = middle
          }
        }
        if (arrI < arr[result[left]]) {
          if (left > 0) p[i] = result[left - 1]
          result[left] = i
        }
      }
    }
  }

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
