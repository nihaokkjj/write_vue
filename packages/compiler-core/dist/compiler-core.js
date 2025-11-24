// packages/compiler-core/src/runtimeHelper.ts
var TO_DISPLAY_STRING = Symbol("TO_DISPLAY_STRING");
var CREATE_TEXT_VNODE = Symbol("CREATE_TEXT_VNODE");
var CREATE_ELEMENT_VNODE = Symbol("CREATE_ELEMENT_VNODE");
var helperMap = {
  [TO_DISPLAY_STRING]: "toDisplayString",
  [CREATE_TEXT_VNODE]: "createTextVNode",
  [CREATE_ELEMENT_VNODE]: "createElementVNode"
};
function createVnodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE);
  return {
    type: 13 /* VNODE_CALL */,
    tag,
    props,
    children
  };
}

// packages/compiler-core/src/ast.ts
function createCallExpression(context, args) {
  let name = context.helper(CREATE_TEXT_VNODE);
  return {
    type: 14 /* JS_CALL_EXPRESSION */,
    arguments: args,
    callee: name
  };
}

// packages/compiler-core/src/parser.ts
function createParserContext(content) {
  return {
    originalSource: content,
    source: content,
    line: 1,
    column: 1,
    offset: 0
  };
}
function isEnd(context) {
  const c = context.source;
  return !c || c.startsWith("</");
}
function advancePositionMutation(context, c, endIndex) {
  let linesCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (c.charCodeAt(i) == 10) {
      linesCount++;
      linePos = i;
    }
  }
  context.offset += endIndex;
  context.line += linesCount;
  context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
}
function advanceBy(context, endIndex) {
  let c = context.source;
  advancePositionMutation(context, c, endIndex);
  context.source = c.slice(endIndex);
}
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
function parseTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
}
function parseText(context) {
  let tokens = ["<", "{{"];
  let endIndex = context.source.length;
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  let start = getCursor(context);
  let content = parseTextData(context, endIndex);
  return {
    type: 2 /* TEXT */,
    content,
    loc: getSelection(context, start)
  };
}
function parseInterpolation(context) {
  const start = getCursor(context);
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  advanceBy(context, openDelimiter.length);
  const closeIndex = context.source.indexOf(closeDelimiter);
  const preContent = context.source.slice(0, closeIndex);
  advanceBy(context, closeIndex);
  const content = preContent.trim();
  advanceBy(context, closeDelimiter.length);
  return {
    type: 5 /* INTERPOLATION */,
    content: {
      type: 4 /* SIMPLE_EXPRESSION */,
      content
    },
    loc: getSelection(context, start)
  };
}
function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
function getSelection(context, start) {
  const end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  };
}
function parseAttributeValue(context) {
  const quote = context.source[0];
  const isQuoted = quote === '"' || quote === "'";
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote, 1);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  } else {
    content = context.source.match(/([^ \t\r\n/>])+/)[1];
    advanceBy(context, content.length);
    advanceSpaces(context);
  }
  return content;
}
function parseAttribute(context) {
  const start = getCursor(context);
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  advanceBy(context, match[0].length);
  let value;
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context);
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
  }
  let loc = getSelection(context, start);
  return {
    type: 6 /* ATTRIBUTE */,
    name,
    value: {
      type: 2 /* TEXT */,
      content: value,
      loc
    },
    loc: getSelection(context, start)
  };
}
function parseAttributes(context) {
  const props = [];
  while (context.source.length > 0 && !context.source.startsWith(">") && !context.source.startsWith("/>")) {
    props.push(parseAttribute(context));
    advanceSpaces(context);
  }
  return props;
}
function parseTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceSpaces(context);
  let props = parseAttributes(context);
  const isSelfClosing = context.source.startsWith("/>");
  advanceBy(context, isSelfClosing ? 2 : 1);
  return {
    type: 1 /* ELEMENT */,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    //开头标签解析后的信息
    props,
    children: []
  };
}
function parseElement(context) {
  const ele = parseTag(context);
  if (!ele.isSelfClosing) {
    ele.children = parseChildren(context);
    if (context.source.startsWith("</")) {
      const endTag = parseTag(context);
      if (endTag.tag !== ele.tag) {
        console.error(`\u6807\u7B7E\u4E0D\u5339\u914D: \u671F\u671B </${ele.tag}>\uFF0C\u4F46\u5F97\u5230 </${endTag.tag}>`);
      }
    }
  } else {
    ele.children = [];
  }
  ele.loc = getSelection(context, ele.loc.start);
  return ele;
}
function parseChildren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const c = context.source;
    let node;
    if (c.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (c[0] === "<") {
      node = parseElement(context);
    } else {
      node = parseText(context);
    }
    nodes.push(node);
  }
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === 2 /* TEXT */) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
      }
    }
  }
  return nodes.filter(Boolean);
}
function createRoot(children) {
  return {
    type: 0 /* ROOT */,
    children
  };
}
function parse(template) {
  const context = createParserContext(template);
  return createRoot(parseChildren(context));
}

// packages/compiler-core/src/transform.ts
function transformElement(node, context) {
  if (1 /* ELEMENT */ === node.type) {
    return function() {
      const tag = JSON.stringify(node.tag);
      let props = null;
      let children = node.children;
      const vnodeCall = createVnodeCall(context, tag, props, children);
      context.currentNode = vnodeCall;
      if (context.parent.type === 0 /* ROOT */) {
        context.parent.codegenNode = vnodeCall;
      }
    };
  }
}
function isText(node) {
  return 2 /* TEXT */ === node.type || 5 /* INTERPOLATION */ === node.type;
}
function transformText(node, context) {
  if (1 /* ELEMENT */ === node.type || 0 /* ROOT */ === node.type) {
    return function() {
      const children = node.children;
      let container = null;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (isText(child)) {
          for (let j = i - 1; j >= 0; j--) {
            const prev = children[j];
            if (isText(prev)) {
              if (!container) {
                container = children[i] = {
                  type: 8 /* COMPOUND_EXPRESSION */,
                  children: [child]
                  // 当前节点作为容器的第一个子节点
                };
              }
              container.children.unshift(prev);
              children.splice(j, 1);
              i--;
            } else {
              container = null;
              break;
            }
          }
        }
      }
      if (children.length === 1 && children[0].type === 8 /* COMPOUND_EXPRESSION */) {
        children[0] = {
          type: 12 /* TEXT_CALL */,
          codegenNode: createCallExpression(context, children[0].children)
          // createCallExpression 内部会调用 context.helper(CREATE_TEXT_VNODE)
        };
      }
    };
  }
}
function transformExpression(node, context) {
  if (5 /* INTERPOLATION */ === node.type) {
    node.content.content = "_ctx." + node.content.content;
  }
}
function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.transformNode;
  const exits = [];
  for (let i2 = 0; i2 < transforms.length; i2++) {
    let exit = transforms[i2](node, context);
    exit && exits.push(exit);
  }
  switch (node.type) {
    case 0 /* ROOT */:
      break;
    case 1 /* ELEMENT */:
      for (let i2 = 0; i2 < node.children.length; i2++) {
        context.parent = node;
        traverseNode(node.children[i2], context);
      }
      break;
    //对表达式的处理
    case 5 /* INTERPOLATION */:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  let i = exits.length;
  if (exits.length) {
    while (i--) {
      exits[i]();
    }
  }
}
function createTransformContext(root) {
  const context = {
    currentNode: root,
    parent: null,
    //createElementVnode createTextVnode createCommentVnode
    transformNode: [transformElement, transformText, transformExpression],
    helpers: /* @__PURE__ */ new Map(),
    helper(name) {
      let count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    }
  };
  return context;
}
function transform(ast) {
  const context = createTransformContext(ast);
  traverseNode(ast, context);
  ast.helpers = [...context.helpers.keys()];
}

// packages/compiler-core/src/index.ts
function compile(template) {
  const ast = parse(template);
  transform(ast);
  return generate(ast);
}
function generate(ast) {
  const context = createCodegenContext();
  const { push, newline } = context;
  const { children } = ast;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    genNode(child, context);
  }
  return {
    code: context.code
  };
}
export {
  compile,
  generate
};
//# sourceMappingURL=compiler-core.js.map
