import { NodeType } from '@voiceflow/general-types';
import { Node, NodeSet } from '@voiceflow/general-types/build/nodes/set';
import Promise from 'bluebird';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { EventType } from '@/runtime/lib/Lifecycle';

import { evaluateExpression, regexExpression } from './utils/shuntingYard';

const setHandler: HandlerFactory<Node> = () => ({
  canHandle: (node: any) => !!(node.type !== NodeType.SET_V2 && node.sets && node.sets.length < 21),
  handle: async (node, runtime, variables) => {
    await Promise.each<NodeSet>(node.sets, async (set) => {
      try {
        if (!set.variable) throw new Error('No Variable Defined');

        const evaluated = await evaluateExpression(set.expression, { v: variables.getState() });
        const value = !!evaluated || !Number.isNaN(evaluated as any) ? evaluated : undefined;
        // assign only if truthy or not literally NaN
        runtime.trace.debug(`setting \`{${set.variable}}\`  \nevaluating \`${regexExpression(set.expression)}\` to \`${value?.toString?.()}\``);
        variables.set(set.variable, value);
      } catch (error) {
        runtime.trace.debug(`unable to resolve expression \`${regexExpression(set.expression)}\` for \`{${set.variable}}\`  \n\`${error}\``);
        await runtime.callEvent(EventType.handlerDidCatch, { error });
      }
    });

    return node.nextId || null;
  },
});

export default setHandler;
