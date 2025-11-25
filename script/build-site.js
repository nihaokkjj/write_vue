// 构建可部署到 GitHub Pages 的示例站点
// 产物输出到 ./site 目录

import { execFileSync } from 'child_process'
import { rmSync, mkdirSync, cpSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const root = process.cwd()
const siteDir = resolve(root, 'site')

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })
}

function clean() {
  rmSync(siteDir, { recursive: true, force: true })
  mkdirSync(siteDir, { recursive: true })
  writeFileSync(resolve(siteDir, '.nojekyll'), '')
}

function buildTargets() {
  // 保持与 dist/index.html 的导入一致（均使用 ESM）
  run('node', ['script/build.js', 'runtime-dom', '-f', 'esm'])
  run('node', ['script/build.js', 'compiler-core', '-f', 'esm'])
}

function assemble() {
  // 拷贝各包 dist 到站点子目录，保证相对路径可用
  cpSync('packages/runtime-dom/dist', resolve(siteDir, 'runtime-dom'), {
    recursive: true,
  })
  cpSync('packages/compiler-core/dist', resolve(siteDir, 'compiler-core'), {
    recursive: true,
  })

  // 根索引页，便于跳转
  const html = `<!doctype html>
<meta charset="utf-8" />
<title>min_Vue demos</title>
<h1>min_Vue demos</h1>
<ul>
  <li><a href="runtime-dom/index.html">runtime-dom demo</a></li>
  <li><a href="compiler-core/index.html">compiler-core demo</a></li>
<ul>
`
  writeFileSync(resolve(siteDir, 'index.html'), html)
}

clean()
buildTargets()
assemble()
console.log(`[site] built at ${siteDir}`)

