import { NodeTypes } from './ast'
import {
  TO_DISPLAY_STRING,
  createVnodeCall,
  createCallExpression,
} from './runtimeHelper'

// dom的遍历方式, 先序, 后续
// 元素 -> 文本 -> 文本处理后 -> 元素处理后 -> 根处理后

function transformElement(node, context) {
  if (NodeTypes.ELEMENT === node.type) {
    // 前序处理
    return function () {
      // 后序：子节点处理完之后执行
      const tag = JSON.stringify(node.tag)
      let props = null
      let children: any = node.children

      if (children.length === 1) {
        children = children[0]
      } else if (children.length === 0) {
        children = null
      }

      const vnodeCall = createVnodeCall(context, tag, props, children)

      Object.assign(node, vnodeCall)
      node.type = NodeTypes.VNODE_CALL

      if (context.parent && context.parent.type === NodeTypes.ROOT) {
        context.parent.codegenNode = node
      }
    }
  }
}

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}

// 文本合并优化：TEXT + INTERPOLATION 合并为 COMPOUND_EXPRESSION
function transformText(node, context) {
  if (node.type === NodeTypes.ELEMENT || node.type === NodeTypes.ROOT) {
    return function () {
      const children = node.children
      let currentContainer = null

      for (let i = 0; i < children.length; i++) {
        const child = children[i]

        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]

            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                }
              }
              currentContainer.children.push(' + ', next)
              children.splice(j, 1)
              j--
            } else {
              currentContainer = null
              break
            }
          }
        }
      }

      // 如果只有一个文本相关子节点，包一层 TEXT_CALL => createTextVNode(...)
      if (children.length === 1 && isText(children[0])) {
        const arg =
          children[0].type === NodeTypes.COMPOUND_EXPRESSION
            ? children[0]
            : children[0]

        children[0] = {
          type: NodeTypes.TEXT_CALL,
          codegenNode: createCallExpression(context, [arg]),
        }
      }
    }
  }
}

function transformExpression(node, context) {
  if (NodeTypes.INTERPOLATION === node.type) {
    if (
      node.content &&
      node.content.type === NodeTypes.SIMPLE_EXPRESSION
    ) {
      node.content.content = '_ctx.' + node.content.content
    }
  }
}

function traverseChildren(parent, context) {
  for (let i = 0; i < parent.children.length; i++) {
    context.parent = parent
    traverseNode(parent.children[i], context)
  }
}

function traverseNode(node, context) {
  context.currentNode = node
  const transforms = context.transformNode

  const exits = [] // 元素函数, 文本函数, 表达式函数
  for (let i = 0; i < transforms.length; i++) {
    const exit = transforms[i](node, context)
    exit && exits.push(exit)
  }

  switch (node.type) {
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break
    case NodeTypes.INTERPOLATION:
      // 记录需要 toDisplayString helper
      context.helper(TO_DISPLAY_STRING)
      break
  }

  let i = exits.length
  if (i) {
    while (i--) {
      exits[i]()
    }
  }
}

function createTransformContext(root) {
  const context: any = {
    currentNode: root,
    parent: null,
    // createElementVnode createTextVnode createCommentVnode
    transformNode: [transformElement, transformText, transformExpression],
    helpers: new Map<symbol, number>(),
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
  }
  return context
}

export function transform(ast) {
  // 对 ast 进行转换
  const context = createTransformContext(ast)
  traverseNode(ast, context)

  // 把需要的 helpers 放到 ast 上，供 codegen 使用
  ast.helpers = [...context.helpers.keys()]
}
