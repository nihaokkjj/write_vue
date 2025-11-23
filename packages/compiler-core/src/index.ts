import { NodeTypes } from './ast'
// 模板装化成ast抽象语法树 -> 妆化生成codegennode -> 生成render函数

function createParserContext(content) {
	return {
		originalSource: content,
		source: content,
		line: 1,
		column: 1,
		offset: 0,
	}
}

function isEnd(context) {
	const c = context.source

	return !c || c.startsWith('</')
}

function advancePositionMutation(context, c, endIndex) {
	let linesCount = 0 // 第几行
	let linePos = -1 // 换行的位置信息

	for (let i = 0; i < endIndex; i++) {
		if (c.charCodeAt(i) == 10) {
			linesCount++
			linePos = i
		}
	}

	context.offset += endIndex
	context.line += linesCount
	context.column =
		linePos == -1 ? context.column + endIndex : endIndex - linePos
}
function advanceBy(context, endIndex) {
	let c = context.source
	// 需要在这里更新位置信息
	advancePositionMutation(context, c, endIndex)
	context.source = c.slice(endIndex)
}
function getCursor(context) {
	let { line, column, offset } = context
	return { line, column, offset }
}

function parseTextData(context, endIndex) {
	const content = context.source.slice(0, endIndex)
	advanceBy(context, endIndex)
	return content
}
function parseText(context) {
	let tokens = ['<', '{{'] //当前离得最近的词法
	let endIndex = context.source.length //假设没有找到

	for (let i = 0; i < tokens.length; i++) {
		const index = context.source.indexOf(tokens[i], 1)
		if (index !== -1 && endIndex > index) {
			endIndex = index
		}
	}
	let start = getCursor(context)
	let content = parseTextData(context, endIndex)
	//0 - endIndex为文本内容
	return {
		type: NodeTypes.TEXT,
		content,
		loc: getSelection(context, start),
	}
}

function parseInterpolation(context) {
	//{{}}
	const start = getCursor(context)
	const openDelimiter = '{{'
	const closeDelimiter = '}}'
	advanceBy(context, openDelimiter.length) // 消耗 {{

	const closeIndex = context.source.indexOf(closeDelimiter)

	// 原始内容（可能包含空格）
	const preContent = context.source.slice(0, closeIndex)

	advanceBy(context, closeIndex) // 消耗内容

	const content = preContent.trim() // 清理插值内部的空白

	advanceBy(context, closeDelimiter.length) // 消耗 }}

	return {
		type: NodeTypes.INTERPOLATION,
		content: {
			type: NodeTypes.SIMPLE_EXPRESSION,
			content,
		},
		loc: getSelection(context, start),
	}
}
function advanceSpaces(context) {
	const match = /^[\t\r\n\f ]+/.exec(context.source)
	if (match) {
		//删除空格
		advanceBy(context, match[0].length)
	}
}
// 获取选中区域的函数，用于记录 AST 节点的 loc 属性
function getSelection(context, start) {
	// 在函数内部获取当前的结束位置
	const end = getCursor(context)

	return {
		start,
		end,
		source: context.originalSource.slice(start.offset, end.offset),
	}
}

function parseAttributeValue(context) {
	const quote = context.source[0]

	const isQuoted = quote === '"' || quote === "'"

	let content
	if (isQuoted) {
		advanceBy(context, 1) //删除引号
		const endIndex = context.source.indexOf(quote, 1)

		content = parseTextData(context, endIndex)
		advanceBy(context, 1) //删除引号
	} else {
		//没有引号
		content = context.source.match(/([^ \t\r\n/>])+/)[1]

		advanceBy(context, content.length)
		advanceSpaces(context)
	}
	return content
}
function parseAttribute(context) {
	const start = getCursor(context)

	//删除一个属性 "a = '1'"中的 a
	let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)

	const name = match[0]

	advanceBy(context, match[0].length)

	let value
	//对于 "a   = '1'"这种情况
	if (/^[\t\r\n\f ]*=/.test(context.source)) {
		advanceSpaces(context)
		advanceBy(context, 1) //删除 =
		advanceSpaces(context)

		value = parseAttributeValue(context)
	}

	let loc = getSelection(context, start)
	return {
		type: NodeTypes.ATTRIBUTE,
		name,
		value: {
			type: NodeTypes.TEXT,
			content: value,
			loc,
		},
		loc: getSelection(context, start),
	}
}
function parseAttributes(context) {
	const props = []

	while (
		context.source.length > 0 &&
		!context.source.startsWith('>') &&
		!context.source.startsWith('/>')
	) {
		props.push(parseAttribute(context))
		advanceSpaces(context)
	}

	return props
}
function parseTag(context) {
	const start = getCursor(context)
	//匹配 <tag 或 </tag 中的标签名
	//0: "<div", 1: "div"
	const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source)

	const tag = match[1] //获取标签名

	advanceBy(context, match[0].length) //删除匹配的内容
	//对于<div   />这种情况, 需要删除多余空格
	advanceSpaces(context)

	let props = parseAttributes(context)
	const isSelfClosing = context.source.startsWith('/>')

	advanceBy(context, isSelfClosing ? 2 : 1) //删除 /> 或 >
	return {
		type: NodeTypes.ELEMENT,
		tag,
		isSelfClosing,
		loc: getSelection(context, start), //开头标签解析后的信息
		props,
		children: [],
	}
}

function parseElement(context) {
	const ele = parseTag(context)

	//如果不是自闭合标签, 递归解析子节点
	if (!ele.isSelfClosing) {
		ele.children = parseChildren(context)

		if (context.source.startsWith('</')) {
			const endTag = parseTag(context)

			// 验证标签匹配
			if (endTag.tag !== ele.tag) {
				// 实际项目中这里会抛出语法错误
				console.error(`标签不匹配: 期望 </${ele.tag}>，但得到 </${endTag.tag}>`)
			}
		}
	} else {
		// 自闭合标签没有子节点
		ele.children = []
	}

	// 4. 记录整个元素节点的完整位置信息
	// 注意：ele.loc.start 是在 parseTag 中记录的开始位置
	ele.loc = getSelection(context, ele.loc.start)
	return ele
}
function parseChildren(context) {
	const nodes = [] as any
	while (!isEnd(context)) {
		const c = context.source //现在解析的内容

		let node
		if (c.startsWith('{{')) {
			node = parseInterpolation(context)
		} else if (c[0] === '<') {
			node = parseElement(context)
		} else {
			//文本
			node = parseText(context)
		}
		nodes.push(node)
	}

	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i]

		if (node.type === NodeTypes.TEXT) {
			//对空白字符做处理
			if (!/[^\t\r\n\f ]/.test(node.content)) {
				nodes[i] = null
			} else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
      }
		}
	}
	//清空空白节点
	return nodes.filter(Boolean)
}

function createRoot(children) {
	return {
		type: NodeTypes.ROOT,
		children,
	}
}
export function parse(template) {
	// 创建解析上下文
	const context = createParserContext(template)

	return createRoot(parseChildren(context))
}
