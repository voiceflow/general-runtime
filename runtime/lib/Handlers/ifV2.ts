import { BaseNode } from '@voiceflow/base-types';

import Handler, { HandlerFactory } from '@/runtime/lib/Handler';

import { TurnType } from '../Constants/flags';
import CodeHandler from './code';

export interface IfV2Options {
  _v1: Handler<BaseNode._v1.Node>;
}

interface DebugError {
  index: number;
  expression: string;
  msg: string;
}

const IfV2Handler: HandlerFactory<BaseNode.IfV2.Node, IfV2Options> = ({ _v1 }) => ({
  canHandle: (node) => {
    return node.type === BaseNode.NodeType.IF_V2;
  },
  handle: async (node, runtime, variables, program) => {
    if (runtime.turn.get<string[]>(TurnType.STOP_TYPES)?.includes(BaseNode.NodeType.IF_V2)) {
      return _v1.handle(node as BaseNode._v1.Node, runtime, variables, program);
    }

    let outputPortIndex = -1;
    const setOutputPort = function (index: number) {
      outputPortIndex = index;
    };
    const debugErrors: Array<DebugError> = [];
    const addDebugError = function (err: DebugError) {
      debugErrors.push(err);
    };

    // use isolated-vm
    const codeHandler = CodeHandler({ callbacks: { setOutputPort, addDebugError }, useStrictVM: true });

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

    await codeHandler.handle(
      { code: codeTemplate, id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE', type: BaseNode.NodeType.CODE },
      runtime,
      variables,
      program
    );

    debugErrors.forEach((err) => runtime.trace.debug(`Error condition ${err.index} - "${err.expression}": ${err.msg}`, BaseNode.NodeType.IF_V2));

    if (outputPortIndex !== -1) {
      runtime.trace.debug(`condition matched - taking path ${outputPortIndex + 1}`, BaseNode.NodeType.IF_V2);
      return node.paths[outputPortIndex].nextID;
    }

    runtime.trace.debug('no conditions matched - taking else path', BaseNode.NodeType.IF_V2);

    return node.payload.elseId || null;
  },
});

export default IfV2Handler;
