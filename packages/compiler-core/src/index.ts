import { NodeTypes } from './ast'
import { parse } from './parser'

export { parse }

// dom的遍历方式, 先序, 后续
function transformElement(node, context) {
  if (NodeTypes.ELEMENT === node.type)
  console.log('处理元素')

}
function transformText(node, context) {
  if (NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type)
    console.log('元素中含有文本')
  console.log('处理文本')

}
function transformExpression(node, context) {
  if (NodeTypes.INTERPOLATION === node.type)
  console.log('处理插值')
  console.log('处理表达式')

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
    }
	}
  return context
}
function traverseNode(node, context) {
  context.currentNode = node
  const transforms = context.transformNode

  for (let i = 0; i < transforms.length; i++) {
    transforms[i](node, context)
  }

  switch(node.type) {
    case NodeTypes.ROOT:
      case NodeTypes.ELEMENT:
        for(let i = 0; i < node.children.length; i++) {
          context.parent = node
          traverseNode(node.children[i], context)
        }
  }
}

function transform(ast) {
	//对ast进行转换
	const context = createTransformContext(ast)

  traverseNode(ast, context)
}
export function compile(template) {
	const ast = parse(template)

	transform(ast)
}
