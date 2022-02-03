import { BaseNode } from '@voiceflow/base-types';
import Promise from 'bluebird';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { EventType } from '@/runtime/lib/Lifecycle';

import { evaluateExpression, regexExpression } from './utils/shuntingYard';

const setHandler: HandlerFactory<BaseNode.Set.Node> = () => ({
  canHandle: (node: any) => !!(node.type !== BaseNode.NodeType.SET_V2 && node.sets && node.sets.length < 21),
  handle: async (node, runtime, variables) => {
    await Promise.each<BaseNode.Set.NodeSet>(node.sets, async (set) => {
      try {
        if (!set.variable) throw new Error('No Variable Defined');

        const evaluated = await evaluateExpression(set.expression, { v: variables.getState() });
        const value = !!evaluated || !Number.isNaN(evaluated as any) ? evaluated : undefined;
        // assign only if truthy or not literally NaN
        runtime.trace.debug(
          `setting \`{${set.variable}}\`  \nevaluating \`${regexExpression(set.expression)}\` to \`${value?.toString?.()}\``,
          BaseNode.NodeType.SET
        );
        variables.set(set.variable, value);
      } catch (error) {
        runtime.trace.debug(
          `unable to resolve expression \`${regexExpression(set.expression)}\` for \`{${set.variable}}\`  \n\`${error}\``,
          BaseNode.NodeType.SET
        );
        await runtime.callEvent(EventType.handlerDidCatch, { error });
      }
    });

    return node.nextId || null;
  },
});

export default setHandler;
