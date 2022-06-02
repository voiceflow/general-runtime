import { BaseNode } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

import CodeHandler from './code';

export type SetV2Options = Record<string, never>;

const SetV2Handler: HandlerFactory<BaseNode.SetV2.Node, SetV2Options | void> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.SET_V2,
  handle: async (node, runtime, variables, program) => {
    // use isolated-vm
    const codeHandler = CodeHandler({ useStrictVM: true });

    let code = `
        let evaluated;
    `;
    node.sets.forEach((set) => {
      if (!set.variable) return;
      if (!variables.has(set.variable)) {
        runtime.variables.set(set.variable, 0);
        variables.set(set.variable, 0);
      }

      code += `
            evaluated = eval(\`${set.expression}\`);
            ${set.variable} = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;
        `;
    });

    await codeHandler.handle(
      { code, id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE', type: BaseNode.NodeType.CODE },
      runtime,
      variables,
      program
    );

    return node.nextId || null;
  },
});

export default SetV2Handler;
