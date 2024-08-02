import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import Handler, { HandlerFactory } from '@/runtime/lib/Handler';

import { TurnType } from '../Constants/flags';
import DebugLogging from '../Runtime/DebugLogging';
import CodeHandler, { GENERATED_CODE_NODE_ID } from './code';

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
  handle: async (node, runtime, variables, program, eventHandler) => {
    if (runtime.turn.get<string[]>(TurnType.STOP_TYPES)?.includes(BaseNode.NodeType.IF_V2)) {
      return _v1.handle(node as BaseNode._v1.Node, runtime, variables, program, eventHandler);
    }

    let outputPortIndex = -1;
    const setOutputPort = function (index: number) {
      outputPortIndex = index;
    };
    const debugErrors: Array<DebugError> = [];
    const addDebugError = function (err: DebugError) {
      debugErrors.push(err);
    };

    const codeHandler = CodeHandler({ callbacks: { setOutputPort, addDebugError } });

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
      { code: codeTemplate, id: GENERATED_CODE_NODE_ID, type: BaseNode.NodeType.CODE },
      runtime,
      variables,
      program,
      eventHandler
    );

    debugErrors.forEach((err) =>
      runtime.trace.debug(`Error condition ${err.index} - "${err.expression}": ${err.msg}`, BaseNode.NodeType.IF_V2)
    );

    if (outputPortIndex !== -1) {
      runtime.trace.debug(`condition matched - taking path ${outputPortIndex + 1}`, BaseNode.NodeType.IF_V2);
      const pathID = node.paths[outputPortIndex].nextID;

      runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CONDITION, node, {
        path: pathID ? DebugLogging.createPathReference(program.getNode(pathID)!) : null,
      });

      return pathID;
    }

    runtime.trace.debug('no conditions matched - taking else path', BaseNode.NodeType.IF_V2);

    const pathID = node.payload.elseId || null;

    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CONDITION, node, {
      path: pathID ? DebugLogging.createPathReference(program.getNode(pathID)!) : null,
    });

    return pathID;
  },
});

export default IfV2Handler;
