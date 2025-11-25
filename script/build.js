// 一次性构建（非 watch），用于 CI/本地打包
// 用法：node script/build.js <target> -f <format>

import minimist from 'minimist'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const require = createRequire(import.meta.url)

const args = minimist(process.argv.slice(2))
const target = args._[0] || 'runtime-dom'
const format = args.f || 'esm' // esbuild 支持：esm/cjs/iife

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.js`)
const pkg = require(`../packages/${target}/package.json`)

async function build() {
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'browser',
    sourcemap: true,
    format,
    globalName: pkg.buildOptions?.name,
  })
  console.log(`[build] ${target} -> ${outfile} (${format})`)
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})

