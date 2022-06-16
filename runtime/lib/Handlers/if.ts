import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { EventType } from '@/runtime/lib/Lifecycle';

import DebugLogging from '../Runtime/DebugLogging';
import { evaluateExpression, regexExpression } from './utils/shuntingYard';

const IfHandler: HandlerFactory<BaseNode.If.Node> = () => ({
  canHandle: (node: any) =>
    !!(node.type !== BaseNode.NodeType.IF_V2 && node.expressions && node.expressions.length < 101),
  handle: async (node, runtime, variables, program) => {
    for (let i = 0; i < node.expressions.length; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const evaluated = await evaluateExpression(node.expressions[i], {
          v: variables.getState(),
        });

        runtime.trace.debug(
          `evaluating path ${i + 1}: \`${regexExpression(node.expressions[i])}\` to \`${evaluated?.toString?.()}\``,
          BaseNode.NodeType.IF
        );

        if (evaluated || evaluated === 0) {
          runtime.trace.debug(`condition true - taking path ${i + 1}`, BaseNode.NodeType.IF);
          const pathID = node.nextIds[i];

          runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CONDITION, node, {
            path: pathID ? DebugLogging.createPathReference(program.getNode(pathID)!) : null,
          });

          return pathID;
        }
      } catch (error) {
        runtime.trace.debug(
          `unable to resolve expression \`${regexExpression(node.expressions[i])}\`  \n\`${error}\``,
          BaseNode.NodeType.IF
        );
        // eslint-disable-next-line no-await-in-loop
        await runtime.callEvent(EventType.handlerDidCatch, { error });
      }
    }

    runtime.trace.debug('no conditions matched - taking else path', BaseNode.NodeType.IF);

    const pathID = node.elseId || null;

    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CONDITION, node, {
      path: pathID ? DebugLogging.createPathReference(program.getNode(pathID)!) : null,
    });

    return pathID;
  },
});

export default IfHandler;
