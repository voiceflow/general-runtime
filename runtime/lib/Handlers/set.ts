import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { EventType } from '@/runtime/lib/Lifecycle';

import { evaluateExpression, regexExpression } from './utils/shuntingYard';

const setHandler: HandlerFactory<BaseNode.Set.Node> = () => ({
  canHandle: (node: any) => !!(node.type !== BaseNode.NodeType.SET_V2 && node.sets && node.sets.length < 21),
  handle: async (node, runtime, variables) => {
    const { changedVariables }: RuntimeLogs.ChangedVariables<any, string> = { changedVariables: {} };

    await Promise.all(
      node.sets.map(async (set) => {
        try {
          if (!set.variable) throw new Error('No Variable Defined');

          const evaluated = await evaluateExpression(set.expression, { v: variables.getState() });
          const value = !!evaluated || !Number.isNaN(evaluated as any) ? evaluated : undefined;
          // assign only if truthy or not literally NaN
          runtime.trace.debug(
            `setting \`{${set.variable}}\`  \nevaluating \`${regexExpression(
              set.expression
            )}\` to \`${value?.toString?.()}\``,
            BaseNode.NodeType.SET
          );
          variables.set(set.variable, value);
          changedVariables[set.variable] = {
            before: variables.get(set.variable) ?? null,
            after: value ?? null,
          };
        } catch (error) {
          runtime.trace.debug(
            `unable to resolve expression \`${regexExpression(set.expression)}\` for \`{${
              set.variable
            }}\`  \n\`${error}\``,
            BaseNode.NodeType.SET
          );
          await runtime.callEvent(EventType.handlerDidCatch, { error });
        }
      })
    );

    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.SET, node, { changedVariables });

    return node.nextId || null;
  },
});

export default setHandler;
