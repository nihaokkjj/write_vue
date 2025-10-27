import { ref } from '@vue/reactivity'
import { h } from './h'
import { isFunction } from '@vue/shared'

export function defineAsyncComponent (options) {

  if (isFunction(options)) {
    options = {loader: options}
  }

  return {
    setup() {
      
      const {
        loader, 
        errorComponent, 
        timeout,
        delay,
        loadingComponent,
        onError
      } = options

      const loaded = ref(false)
      const error = ref(false) //超时处理
      const loading = ref(false)

      let loadingTimer = null
      if (delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, delay)
      }

      let Comp = null
      let attempts = 0
      function loadFunc() {
        return loader().catch(err => {
          if (onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc())
              const fail = () => reject(err)
              onError(err, retry, fail, ++attempts)
            })
          } else {
            throw err //将错误继续传递
          }
        })
      }

      if (timeout) {
        setTimeout(() => {
          error.value = true
          throw new Error("组件加载失败")
        }, timeout)
      }

      loadFunc()
      .then((comp) => {
        Comp = comp
        loaded.value = true
       }).catch(err => {
          error.value = err
        }).finally(() => {
          loading.value = false
          //无论成功还是失败, 都不会触发
          loadingTimer && clearTimeout(loadingTimer)
        })

        const placeholder = h("div")

        return () => {
          if (loaded.value) {
            return h(Comp)
          } else if (error.value && errorComponent) {
            return h(errorComponent)
          } else if (loading.value && loadingComponent) {
            return h(loadingComponent)
          } else {
            return placeholder
          }
        }
    }
  }

}












