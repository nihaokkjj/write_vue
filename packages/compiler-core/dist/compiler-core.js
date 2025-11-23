// packages/compiler-core/src/index.ts
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
function parseAttribute(context) {
  const start = getCursor(context);
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  advanceBy(context, match[0].length);
  return {
    type: 6 /* ATTRIBUTE */,
    name,
    value: {
      type: 2 /* TEXT */,
      content: "?",
      loc: "?"
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
    props
  };
}
function parseElement(context) {
  const ele = parseTag(context);
  if (!ele.isSelfClosing) {
    const children = parseChildren(context);
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
  return nodes;
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
export {
  parse
};
//# sourceMappingURL=compiler-core.js.map
