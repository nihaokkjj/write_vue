import { parse } from './parser'
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperMap,
} from './runtimeHelper'
import { transform } from './transform'
import { NodeTypes } from './ast'

export function compile(template) {
  const ast = parse(template)
  transform(ast)
  return generate(ast)
}

function createCodegenContext(ast) {
  const context: any = {
    code: ``,
    level: 0,
    helper(name) {
      return '_' + helperMap[name]
    },
    push(code) {
      context.code += code
    },
    indent() {
      newline(++context.level)
    },
    deindent() {
      newline(--context.level)
    },
  }

  function newline(n) {
    context.push('\n' + `  `.repeat(n))
  }

  return context
}

// 递归生成 AST 节点的代码
function genNode(node, context) {
  const { push } = context
  switch (node.type) {
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.TEXT:
      push(JSON.stringify(node.content))
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      push(node.content)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    case NodeTypes.TEXT_CALL:
      genNode(node.codegenNode, context)
      break
    // ... 其他节点类型按需扩展
  }
}

// 生成 createElementVNode(...)
function genVNodeCall(node, context) {
  const { push, helper } = context
  const children = node.children

  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  // tag
  push(node.tag)
  push(', ')
  // 目前 props 写死为空
  push('null')
  push(', ')

  // children
  if (Array.isArray(children)) {
    push('[')
    for (let i = 0; i < children.length; i++) {
      genNode(children[i], context)
      if (i < children.length - 1) push(', ')
    }
    push(']')
  } else if (children) {
    genNode(children, context)
  } else {
    push('null')
  }

  push(')')
}

// 生成 JS 调用表达式 (如 createTextVNode(...) )
function genCallExpression(node, context) {
  const { push, helper } = context
  push(`${helper(node.callee)}(`)

  const args = node.arguments || []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (typeof arg === 'string') {
      push(arg)
    } else {
      genNode(arg, context)
    }
    if (i < args.length - 1) push(', ')
  }

  push(')')
}

// {{ xxx }}
function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

// COMPOUND_EXPRESSION: ["text", " + ", interpolationNode, ...]
function genCompoundExpression(node, context) {
  const { push } = context
  const children = node.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (typeof child === 'string') {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}

function genFunctionPreamble(ast, context) {
  const { push } = context

  if (ast.helpers && ast.helpers.length) {
    push(
      `const {${ast.helpers
        .map((item) => `${helperMap[item]}:${context.helper(item)}`)
        .join(', ')}} = Vue`
    )
  }
  push('\n')
  push('return function render(_ctx) {')
}

export function generate(ast) {
  const context = createCodegenContext(ast)
  const { push } = context

  genFunctionPreamble(ast, context)
  push('\n  return ')

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push('null')
  }

  push('\n}')
  return context.code
}
