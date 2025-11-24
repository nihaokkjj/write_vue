import { parse } from './parser'
import { createCallExpression, NodeTypes } from './ast'
import { TO_DISPLAY_STRING } from './runtimeHelper'
import { createVnodeCall } from './runtimeHelper'


// dom的遍历方式, 先序, 后续
// 元素 -> 文本 -> 文本处理后 -> 元素处理后 -> 根处理后
// index.ts - transformElement 函数

function transformElement(node, context) {
    if (NodeTypes.ELEMENT === node.type) {
        
        // 【前序处理】：处理 v-if/v-for 指令，但此处简化为只返回后序函数
        
        return function () {
            // 【后序处理】：在子节点都处理完毕后执行

            // 1. 默认设置：tag 为字符串，props 为 null，children 为 null
            const tag = JSON.stringify(node.tag)
            let props = null 
            let children = node.children

            // 2. 检查子节点数量，如果只有一个，直接取第一个
            if (children.length === 1) {
                children = children[0]
            } else if (children.length === 0) {
                children = null
            } 
            // 如果多于一个，children 保持为数组 [child1, child2, ...]

            // 3. 创建 VNODE_CALL (Code Generation Node)
            const vnodeCall = createVnodeCall(context, tag, props, children)
            
            // 4. 将 ELEMENT 节点替换为 VNODE_CALL (通过 Object.assign 替换属性)
            // 这样做可以让父节点 children 数组中的引用指向新的 VNODE_CALL
            Object.assign(node, vnodeCall)
            node.type = NodeTypes.VNODE_CALL
            
            // 5. 将 VNODE_CALL 挂载到根节点的 codegenNode 上 (如果是根节点)
            if (context.parent.type === NodeTypes.ROOT) {
                context.parent.codegenNode = vnodeCall
            }
        }
    }
}

function isText(node) {
	return NodeTypes.TEXT === node.type || NodeTypes.INTERPOLATION === node.type
}
function transformText(node, context) {
	if (NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type) {
		//注意处理顺序, 要等待子节点全部处理后, 再赋值给父元素
		return function () {
      const children = node.children
      let container = null // 用于保存合并后的 COMPOUND_EXPRESSION
      
      // 从后往前遍历，因为合并操作会改变数组长度
      for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i]
  
          // 检查当前节点是否是 TEXT 或 INTERPOLATION
          if (isText(child)) {
              // 从当前节点往前找相邻的文本/插值
              for (let j = i - 1; j >= 0; j--) {
                  const prev = children[j]
  
                  if (isText(prev)) {
                      // 如果相邻的也是文本/插值，则进行合并
                      if (!container) {
                          // 第一次合并：创建 COMPOUND_EXPRESSION 容器
                          container = children[i] = {
                              type: NodeTypes.COMPOUND_EXPRESSION,
                              children: [child] // 当前节点作为容器的第一个子节点
                          }
                      }
  
                      // 1. 将前一个节点添加到容器头部
                      container.children.unshift(prev)
                      
                      // 2. 将前一个节点从父节点的 children 数组中移除
                      children.splice(j, 1)
  
                      // 3. 更新外层循环的索引 i，因为数组长度和位置都变了
                      i--
                  } else {
                      // 遇到非文本节点（如 Element），停止向前合并
                      container = null
                      break
                  }
              }
          }
      }
  
      // 最终：如果父节点的 children 数组只剩一个 COMPOUND_EXPRESSION，
      // 将其包装成一个 CREATE_TEXT_VNODE 调用（例如：_createTextVNode("hello" + _toDisplayString(name))）
      if (children.length === 1 && children[0].type === NodeTypes.COMPOUND_EXPRESSION) {
          // 创建 TEXT_CALL 节点，它会被 CodeGen 翻译成 createTextVNode
          children[0] = {
              type: NodeTypes.TEXT_CALL,
              codegenNode: createCallExpression(context, children[0].children) 
              // createCallExpression 内部会调用 context.helper(CREATE_TEXT_VNODE)
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


export function transform(ast) {
	//对ast进行转换
	const context = createTransformContext(ast)

	traverseNode(ast, context)

	ast.helpers = [...context.helpers.keys()]
}



