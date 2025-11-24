# min_Vue（从零实现 Vue3 核心的最小项目）

一个以 Vue3 思想为蓝本的最小实现，覆盖响应式系统、运行时（核心与 DOM）、组件系统、调度与部分编译器能力。项目采用 monorepo 结构（pnpm workspace），用 esbuild 做开发期打包与 watch。

## 功能概览
- 响应式系统（packages/reactivity）
  - `reactive`/`ref`/`computed`/`effect`/`watch`/`watchEffect`
  - 依赖收集与触发：WeakMap(target→Map(key→dep))，双向记忆（dep ↔ effect）优化
  - 计算属性懒执行与脏值标记（`DirtyLevels`），`proxyRefs` 自动脱 ref
- 运行时核心（packages/runtime-core）
  - 虚拟节点与 `h`、`createVnode`、`Fragment`/`Text`、`ShapeFlags`
  - 组件实例/`setup`/`props`/`attrs`/`slots`/`emit`/`expose`
  - 生命周期：`onBeforeMount`/`onMounted`/`onBeforeUpdate`/`onUpdated`
  - `provide`/`inject`
  - 异步组件：`defineAsyncComponent`（支持 `loader`+`delay`+`timeout`+`error/loading` 组件与 `onError(retry/fail)`）
  - 内置组件：`Teleport`、`Transition`
  - 渲染与 Diff：带 `key` 的子节点比较 + 最长递增子序列（LIS）移动优化
  - Block/动态节点：`openBlock`/`createElementBlock`/`patchFlag`（支持 `TEXT/CLASS/STYLE` 等）
  - 微任务调度：`queueJob`（去重 + Promise 微任务批量刷新）
- 运行时 DOM（packages/runtime-dom）
  - `nodeOps` 封装 DOM 增删改查
  - `patchProp` 针对 `class`/`style`/事件/普通属性分别处理
  - 事件采用 invoker 机制，减少解绑/重绑成本
- 编译器核心（packages/compiler-core）
  - `parse`：模板 → AST（支持元素、文本、插值 `{{}}`，保留位置信息 `loc`）
  - `transform`：表达式前缀 `_ctx.`、TEXT + INTERPOLATION 合并为 `COMPOUND_EXPRESSION`、生成 `VNODE_CALL`
  - `codegen`：输出 `render(_ctx){ return createElementVNode(...) }` 字符串代码，自动注入 helpers（如 `toDisplayString`）
- 公共工具（packages/shared）
  - `ShapeFlags`/`PatchFlags` 及常用类型守卫

## 目录结构
- packages/shared：通用工具与位运算标识
- packages/reactivity：响应式核心与 watch 系列
- packages/runtime-core：平台无关渲染器、组件系统、Diff、内置组件
- packages/runtime-dom：DOM 平台适配（nodeOps + patchProp 模块化）
- packages/compiler-core：解析/转换/代码生成
- script/dev.js：基于 esbuild 的按包打包与 watch 脚本

## 快速开始
- 环境：Node 18+，pnpm（本项目记录为 `pnpm@10.17.0`）
- 安装依赖：
  ```bash
  pnpm i
  ```
- 开发打包（默认打包 compiler-core，为 ESM）：
  ```bash
  pnpm dev
  # 等价于：node script/dev.js compiler-core -f esm
  ```
- 指定打包目标与格式（常用：esm/global/cjs）：
  ```bash
  # 运行时（DOM）
  node script/dev.js runtime-dom -f esm
  node script/dev.js runtime-dom -f global  # 生成 UMD，全局名见各包 package.json 的 buildOptions.name

  # 响应式
  node script/dev.js reactivity -f esm

  # 运行时核心
  node script/dev.js runtime-core -f esm

  # 编译器核心
  node script/dev.js compiler-core -f esm
  ```

提示：脚本会输出到 `packages/<target>/dist/<target>.js`，并处于 watch 模式。

## 使用示例
- 在浏览器用运行时渲染（global 构建后）：
  ```html
  <!-- 先执行：node script/dev.js runtime-dom -f global -->
  <div id="app"></div>
  <script src="./packages/runtime-dom/dist/runtime-dom.js"></script>
  <script>
    const { h, render, ref } = RuntimeDom
    const count = ref(0)
    const vnode = h('button', { onClick(){ count.value++ } }, 'count: ' + count.value)
    render(vnode, document.getElementById('app'))

    // 简单更新：再次 render 新 vnode（本项目演示用）
    setInterval(() => {
      render(h('button', { onClick(){ count.value++ } }, 'count: ' + count.value), document.getElementById('app'))
    }, 1000)
  </script>
  ```

- 使用编译器把模板编译为渲染函数代码：
  ```ts
  import { compile } from './packages/compiler-core/src/index'
  const code = compile('<div>hello {{name}}</div>')
  console.log(code)
  // 输出形如：
  // const {toDisplayString:_toDisplayString,createElementVNode:_createElementVNode} = Vue
  // return function render(_ctx) {
  //   return _createElementVNode("div", null, _toDisplayString(_ctx.name))
  // }
  ```

- 异步组件/Teleport/Transition（API 与 Vue3 类似，适合在 runtime 层做交互演示），可参考：
  - `packages/runtime-core/src/defineAsyncComponent.ts`
  - `packages/runtime-core/src/components/Teleport.ts`
  - `packages/runtime-core/src/components/Transition.ts`

## 关键实现细节（摘要）
- 响应式
  - 依赖收集：`track(target,key)` → `targetMap[target].get(key)` → `dep(Map)`；`trackEffect(effect, dep)` 双向关联并按次序清理失效依赖
  - 触发更新：`trigger(target,key)` → `triggerEffects(dep)`，计算属性通过 `dirty` 标记懒求值
  - watch：统一走 `doWatch`，支持 `deep`、`immediate`、`onCleanup`
- 渲染与 Diff
  - `patch` 按 `type/shapeFlag` 分派：元素/组件/Fragment/Text/Teleport
  - 儿子比较：头尾指针 + 中间映射 + LIS 移动优化
  - Block/动态节点：`openBlock/createElementBlock/setupBlock` 收集 `dynamicChildren`，结合 `PatchFlags` 做定向更新（如只更 `TEXT/CLASS/STYLE`）
  - 事件：invoker 复用函数引用，减少 add/removeEventListener 次数
- 组件系统
  - 实例化：`createComponentInstance`，上下文代理访问 `data/props/setupState/$attrs/$slots`
  - `setup(props, { slots, attrs, emit, expose })`；`proxyRefs` 让 `setupState`/`template` 使用更自然
  - 生命周期执行前后通过 `currentInstance` 校准上下文
  - `provide/inject` 通过原型链式 `provides` 继承 + 首次写时拷贝
- 编译器
  - `parse` 记录 `loc` 位置；`transformExpression` 给插值加 `_ctx.` 前缀
  - `transformText` 合并相邻 TEXT/INTERPOLATION，必要时包一层 `TEXT_CALL`
  - `codegen` 输出 helpers 导入前导码 + `render` 函数体

## 已知限制/注意事项
- 编译器仅覆盖最小子集：元素、文本、插值与基础文本合并；属性/指令/条件/循环等尚未实现
- `patchProps` 目前只处理 `class/style/事件/通用 attr`，不含复杂 DOM Props
- 组件更新判断 `shouldComponentUpdate` 和 `props/slots` 逻辑为教学取舍，未覆盖所有边界
- LIS 实现（`packages/runtime-core/src/seq.ts`）里二分右边界使用了 `length`（未定义），应为 `result.length`；在复杂 keyed diff 下可能影响顺序优化
- demo 代码为演示性质，实际项目需配合 bundler（Vite/Rollup/Webpack）与 TS 构建

## 开发脚本与构建
- 开发脚本：`script/dev.js`（esbuild watch）
  - 入口：`packages/<target>/src/index.ts`
  - 输出：`packages/<target>/dist/<target>.js`
  - `-f` 指定打包格式；全局名取自各包 `package.json.buildOptions.name`

## 许可证
本项目用于学习与实验，未附带正式开源许可证。请勿用于生产环境。

