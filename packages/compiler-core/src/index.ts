import { PatchFlags } from 'packages/shared/src/patchFlags'
import { createCallExpression, NodeTypes } from './ast'
import { parse } from './parser'
import { TO_DISPLAY_STRING } from './runtimeHelper'

export { parse }

// dom的遍历方式, 先序, 后续
// 元素 -> 文本 -> 文本处理后 -> 元素处理后 -> 根处理后
function transformElement(node, context) {
	if (NodeTypes.ELEMENT === node.type) console.log('处理元素')
}

function isText(node) {
	return NodeTypes.TEXT === node.type || NodeTypes.INTERPOLATION === node.type
}
function transformText(node, context) {
	if (NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type) {
		//注意处理顺序, 要等待子节点全部处理后, 再赋值给父元素
		return function () {
			console.log('文本处理后触发')

			const children = node.children
			let container = null
			let hasText = false //是否有文本
			for (let i = 0; i < children.length; i++) {
				let child = children[i]

				if (isText(child)) {
					hasText = true
					for (let j = i + 1; j < children.length; j++) {
						const next = children[j]

						if (isText(next)) {
							if (!container) {
								container = children[i] = {
									type: NodeTypes.COMPOUND_EXPRESSION,
									children: [child],
								}
							}
							container.children.push(`+`, next)
							children.splice(j, 1)
							j--
						} else {
							container = null
							break
						}
					}
				}
			}
			//只有一个文本节点就不需要合并, 不需要createTextVnode

			if (!hasText && children.length === 1) {
				//没有文本或者只有一个文本节点
				return
			}

			for (let i = 0; i < children.length; i++) {
				const child = children[i]

				if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
					const args = []
					args.push(child)
					if (child.type === NodeTypes.TEXT) {
						args.push(PatchFlags.TEXT)
					}

					children[i] = {
						type: NodeTypes.TEXT_CALL, //vreateTextVnode
						content: child,
						codegenNode: createCallExpression(context, args),
					}
				}
			}
		}
	}
}
function transformExpression(node, context) {
	if (NodeTypes.INTERPOLATION === node.type) {
		node.content.content = '_ctx.' + node.content.content
	}
}
function createTransformContext(root) {
	const context = {
		currentNode: root,
		parent: null,
		//createElementVnode createTextVnode createCommentVnode
		transformNode: [transformElement, transformText, transformExpression],

		helpers: new Map(),
		helper(name) {
			let count = context.helpers.get(name) || 0
			context.helpers.set(name, count + 1)
			return name
		},
	}
	return context
}
function traverseNode(node, context) {
	context.currentNode = node
	const transforms = context.transformNode

	const exits = [] //元素函数, 文本函数, 表达式函数
	for (let i = 0; i < transforms.length; i++) {
		let exit = transforms[i](node, context)
		exit && exits.push(exit)
	}

	switch (node.type) {
		case NodeTypes.ROOT:
			break
		case NodeTypes.ELEMENT:
			for (let i = 0; i < node.children.length; i++) {
				context.parent = node
				traverseNode(node.children[i], context)
			}
			break
		//对表达式的处理
		case NodeTypes.INTERPOLATION:
			context.helper(TO_DISPLAY_STRING)
			break
	}

	let i = exits.length
	if (exits.length) {
		while (i--) {
			exits[i]()
		}
	}
}

function transform(ast) {
	//对ast进行转换
	const context = createTransformContext(ast)

	traverseNode(ast, context)

	ast.helpers = [...context.helpers.keys()]
}
export function compile(template) {
	const ast = parse(template)
	transform(ast)
  return ast
}
