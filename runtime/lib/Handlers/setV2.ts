import { NodeType } from '@voiceflow/general-types/build';
import { Node } from '@voiceflow/general-types/build/nodes/setV2';

import { HandlerFactory } from '@/runtime/lib/Handler';

import CodeHandler from './code';

export type SetV2Options = {
  safe?: boolean;
};

const SetV2Handler: HandlerFactory<Node, SetV2Options | void> = ({ safe } = {}) => ({
  canHandle: (node) => node.type === NodeType.SET_V2,
  handle: async (node, runtime, variables, program) => {
    const codeHandler = CodeHandler({ safe });

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

    await codeHandler.handle({ code, id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE', type: NodeType.CODE }, runtime, variables, program);

    return node.nextId || null;
  },
});

export default SetV2Handler;
