import { NodeTypes } from './ast'
import { parse } from './parser'
import { T0_DISPLAY_STRING } from './runtimeHelper'

export { parse }

// dom的遍历方式, 先序, 后续
// 元素 -> 文本 -> 文本处理后 -> 元素处理后 -> 根处理后
function transformElement(node, context) {
	if (NodeTypes.ELEMENT === node.type) console.log('处理元素')
}
function transformText(node, context) {
	if (NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type)
		console.log('元素中含有文本')

	return function () {
		console.log('文本处理后触发')
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
      context.helper(T0_DISPLAY_STRING)
      break
	}

	let i = exits.length - 1
	if (exits.length) {
		while (i--) {
			exits[i]()
		}
	}
}

function transform(ast) {
	//对ast进行转换
	const context = createTransformContext(ast)

	traverseNode(ast, context);

  ast.helpers = [...context.helpers.keys()]
}
export function compile(template) {
	const ast = parse(template)
	transform(ast)
}
