import { NodeType } from '@voiceflow/general-types/';
import { Node as V1Node } from '@voiceflow/general-types/build/nodes/_v1';
import { Node } from '@voiceflow/general-types/build/nodes/ifV2';

import Handler, { HandlerFactory } from '@/runtime/lib/Handler';

import { TurnType } from '../Constants/flags';
import CodeHandler from './code';

export type IfV2Options = {
  safe?: boolean;
  _v1: Handler<V1Node>;
};

type DebugError = { index: number; expression: string; msg: string };

const IfV2Handler: HandlerFactory<Node, IfV2Options> = ({ _v1, safe }) => ({
  canHandle: (node) => {
    return node.type === NodeType.IF_V2;
  },
  handle: async (node, runtime, variables, program) => {
    if (runtime.turn.get<string[]>(TurnType.STOP_TYPES)?.includes(NodeType.IF_V2)) {
      return _v1.handle(node as V1Node, runtime, variables, program);
    }

    let outputPortIndex = -1;
    const setOutputPort = function(index: number) {
      outputPortIndex = index;
    };
    const debugErrors: Array<DebugError> = [];
    const addDebugError = function(err: DebugError) {
      debugErrors.push(err);
    };

    const codeHandler = CodeHandler({ callbacks: { setOutputPort, addDebugError }, safe });

    let code = '';
    for (let i = 0; i < node.payload.expressions.length; i++) {
      const expression = node.payload.expressions[i];
      code += `
            try {
              if(eval(\`${expression}\`)) {
                setOutputPort(${i});
                throw(null);
              }
            } catch (err) {
              if (err != null) {
                addDebugError({ index: ${i + 1}, expression: \`${expression}\`, msg: err.toString() });
              } else {
                // matched - exit early
                throw(null);
              }
            }
        `;
    }

    const codeTemplate = `try { ${code} } catch (err) {}`;

    await codeHandler.handle({ code: codeTemplate, id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE', type: NodeType.CODE }, runtime, variables, program);

    debugErrors.forEach((err) => runtime.trace.debug(`Error condition ${err.index} - "${err.expression}": ${err.msg}`));

    if (outputPortIndex !== -1) {
      runtime.trace.debug(`condition matched - taking path ${outputPortIndex + 1}`);
      return node.paths[outputPortIndex].nextID;
    }

    runtime.trace.debug('no conditions matched - taking else path');

    return node.payload.elseId || null;
  },
});

export default IfV2Handler;
