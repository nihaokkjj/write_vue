import { parse } from './parser'
import {
	CREATE_ELEMENT_VNODE,
	TO_DISPLAY_STRING,
	CREATE_TEXT_VNODE,
	helperMap,
} from './runtimeHelper'
import { transform } from './transform'
import { NodeTypes } from './ast'

export function compile(template) {
	const ast = parse(template)
	transform(ast)
	return generate(ast)
}

function createCodegenContext() {
	const context = {
		code: ``,
		level: 0,
		helper(name) {
			return '_' + helperMap[name]
		},
		push(code) {
			context.code += code
		},
		indent() {
			newLine(++context.level)
		},
		deindent(noNewLine = false) {
			newLine(--context.level)
		},
	}
	function newLine(n) {
		context.push('\n' + `  `.repeat(n))
	}

	return context
}
// 递归生成 AST 节点的代码
function genNode(node, context) {
	const { push } = context
	switch (node.type) {
		case NodeTypes.VNODE_CALL:
			// 生成 createElementVNode(...)
			genVNodeCall(node, context)
			break
		case NodeTypes.TEXT:
			push(JSON.stringify(node.content)) // 'Hello'
			break
		case NodeTypes.INTERPOLATION:
		case NodeTypes.SIMPLE_EXPRESSION:
			// 生成 _ctx.name 或 toDisplayString(_ctx.name)
			genCallExpression(node.content, context)
			break
		case NodeTypes.JS_CALL_EXPRESSION:
			genCallExpression(node, context)
			break
		// ... 其他节点类型
	}
}

// 补充：生成 VNODE_CALL 的逻辑
function genVNodeCall(node, context) {
	const { push, helper } = context
	// 假设 tag, props, children 已经就位
	push(
		`${helper(CREATE_ELEMENT_VNODE)}(${node.tag}, ${node.props}, ${
			node.children
		})`
	)
}

// 补充：生成 CallExpression 的逻辑 (例如 toDisplayString(_ctx.name))
function genCallExpression(node, context) {
	const { push, helper } = context
	push(`${helper[node.callee]}(`)
	genNode(node.arguments[0], context) // 简化：只处理第一个参数
	push(`)`)
}

export function generate(ast) {
	const context = createCodegenContext()
	const { push, indent, deindent } = context

	// 1. 导入辅助函数（假设从全局 Vue 对象获取）
	const helpers = [...ast.helpers.keys()]
	push(`const { ${
        helpers.map(s => helperMap[s]).map(n => `_${n}: ${n}`).join(', ')
    } } = Vue`) 
    // 例如：const { _toDisplayString: toDisplayString } = Vue

	// 2. 拼接 render 函数签名
	push(`\nreturn function render(_ctx, _cache) {`)
	indent()
	
	// 3. 递归生成 AST 的代码
	push(`return `)
	genNode(ast.codegenNode, context) // ast.codegenNode 是最终要渲染的 VNODE_CALL
	
	deindent()
	push(`\n}`)

	return context.code
}