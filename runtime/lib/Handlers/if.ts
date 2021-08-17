import { Node } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import { EventType } from '@/runtime/lib/Lifecycle';

import { evaluateExpression, regexExpression } from './utils/shuntingYard';

const IfHandler: HandlerFactory<Node.If.Node> = () => ({
  canHandle: (node: any) => !!(node.type !== Node.NodeType.IF_V2 && node.expressions && node.expressions.length < 101),
  handle: async (node, runtime, variables) => {
    for (let i = 0; i < node.expressions.length; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const evaluated = await evaluateExpression(node.expressions[i], {
          v: variables.getState(),
        });

        runtime.trace.debug(`evaluating path ${i + 1}: \`${regexExpression(node.expressions[i])}\` to \`${evaluated?.toString?.()}\``);

        if (evaluated || evaluated === 0) {
          runtime.trace.debug(`condition true - taking path ${i + 1}`);
          return node.nextIds[i];
        }
      } catch (error) {
        runtime.trace.debug(`unable to resolve expression \`${regexExpression(node.expressions[i])}\`  \n\`${error}\``);
        // eslint-disable-next-line no-await-in-loop
        await runtime.callEvent(EventType.handlerDidCatch, { error });
      }
    }

    runtime.trace.debug('no conditions matched - taking else path');

    return node.elseId || null;
  },
});

export default IfHandler;
