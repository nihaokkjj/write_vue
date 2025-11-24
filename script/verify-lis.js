// Verify LIS-based move optimization used in keyed diff

function getSquence(arr) {
  let result = [0]
  const len = arr.length
  const p = new Array(len)
  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
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
          if (arr[result[middle]] < arrI) left = middle + 1
          else right = middle
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

function toMap(arr) {
  const m = new Map()
  for (let i = 0; i < arr.length; i++) m.set(arr[i], i)
  return m
}

function buildNewIndexToOldIndex(oldKeys, newKeys) {
  const keyToNew = toMap(newKeys)
  const res = new Array(newKeys.length).fill(0)
  for (let oldIndex = 0; oldIndex < oldKeys.length; oldIndex++) {
    const key = oldKeys[oldIndex]
    const newIndex = keyToNew.get(key)
    if (newIndex !== undefined) res[newIndex] = oldIndex + 1
  }
  return res
}

function analyzeMoves(newIndexToOldIndex) {
  const lis = getSquence(newIndexToOldIndex)
  let j = lis.length - 1
  let creates = 0
  let moves = 0
  for (let i = newIndexToOldIndex.length - 1; i >= 0; i--) {
    if (newIndexToOldIndex[i] === 0) {
      creates++
    } else {
      if (j >= 0 && i === lis[j]) {
        j-- // kept in place (no move)
      } else {
        moves++
      }
    }
  }
  return { lisIndices: lis, creates, moves }
}

function verify(oldKeys, newKeys) {
  const mapArr = buildNewIndexToOldIndex(oldKeys, newKeys)
  const { lisIndices, creates, moves } = analyzeMoves(mapArr)
  console.log('oldKeys  :', JSON.stringify(oldKeys))
  console.log('newKeys  :', JSON.stringify(newKeys))
  console.log('mapping  :', JSON.stringify(mapArr))
  console.log('LIS idx  :', JSON.stringify(lisIndices))
  console.log('creates  :', creates, 'moves:', moves)
  console.log('---')
}

// Case 1：简单交换 + 插入
verify([1,2,3,4,5,6,7], [1,3,2,5,4,8,6,7])

// Case 2：中间块重排
verify([1,2,3,4,5], [2,1,4,3,6,5])

// Case 3：纯插入
verify([1,2,3], [1,2,3,4,5])

