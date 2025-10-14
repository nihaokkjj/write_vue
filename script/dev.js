//帮我们打包packages下的模块, 最终打包出js文件

//"dev": "node script/dev.js (要打包的名字 -f 打包的格式) === argv.slice(2)"


import minimist from 'minimist'
//node中的命令参数通过process来获取
import {resolve, dirname} from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url) //获取文件的绝对路径 file
const __dirname = dirname(__filename)

const require = createRequire(import.meta.url)
const args = minimist(process.argv.slice(2)) //解析命令行参数

const target = args._[0] || "reactivity1"//打包那个项目
const format = args.f || "iife" //打包后的模块化规范

//node中esm模块没有__dirname
// console.log(target, format)
//入口文件
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
const pkg = require(`../packages/${target}/package.json`)



esbuild.context({
  entryPoints: [entry], //入口
  //出口
  outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`),
  bundle: true, //会打包在一起
  platform: "browser",//打包后给浏览器使用
  sourcemap: true, //可以调试源代码
  format, //cjs esm life
  globalName: pkg.buildOptions?.name, //打包后的名字
}).then((ctx) => {
  console.log("start dev")
  return ctx.watch() //监控入口文件持续进行打包
})


