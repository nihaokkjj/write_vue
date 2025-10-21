export default function getSquence(arr) {

  let result = [0]
  let len = arr.length
  const p = result.slice(0)

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      //最后一项和当前遍历的数来比对
      let resultLast = arr[result[result.length - 1]] 
      if (arrI > arr[resultLast]) {
        p[i] = result[result.length - 1]
        result.push(i)
      } else {
        let left = 0
        let right = length - 1
        let middle = 0

        while(left < right) {
          middle = Math.floor((left + right) / 2)
          if (arr[result[middle]] < arrI) {
            left = middle + 1
          } else {
            right = middle
          }  
        }
        if(arrI < arr[result[middle]]) {
          p[i] = result[middle - 1]
          result[middle] = i
        }
      }
    }
  }

  let l = result.length
  let last = result[l - 1]
  while(l-- > 0) {
    result[l] = last
    last = p[last]
  }
  return result
}
//根据前驱节点找出最长的子序列, 因为最后一项不会错误,
//从而找出完整正确的子序列

