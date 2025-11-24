import { PatchFlags } from 'packages/shared/src/patchFlags'
import { createCallExpression, NodeTypes } from './ast'
import { TO_DISPLAY_STRING } from './runtimeHelper'

import { parse } from './parser'
import { transform } from './transform'



export function compile(template) {
	const ast = parse(template)
	transform(ast)
	return generate(ast)
}

export function generate(ast) {
	const context = createCodegenContext()
	const { push, newline } = context
	const { children } = ast
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		genNode(child, context)
	}
	return {
		code: context.code,
	}
}
