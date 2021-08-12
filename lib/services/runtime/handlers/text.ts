import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { NodeType, TraceType } from '@voiceflow/general-types';
import { Descendant, Node, TraceFrame } from '@voiceflow/general-types/build/nodes/text';
import _sample from 'lodash/sample';
import { Text } from 'slate';

import log from '@/logger';
import { HandlerFactory } from '@/runtime';

const slateToPlaintext = (content: Descendant[] = []): string =>
  content.reduce((acc, n) => {
    acc += Text.isText(n) ? n.text : slateToPlaintext(n.children);
    return acc;
  }, '');

const slateInjectVariables = (variables: Record<string, unknown>) => {
  const injectVariables = (content: Descendant[] = []): Descendant[] =>
    content.map((n) =>
      Text.isText(n)
        ? {
            ...n,
            // to counteract replaceVariables trim effect: https://github.com/voiceflow/common/blob/master/src/utils/variables.ts#L21
            text: n.text.trim() ? replaceVariables(n.text, variables) : n.text,
          }
        : {
            ...n,
            ...(Array.isArray(n.children) && { children: injectVariables(n.children) }),
          }
    );

  return injectVariables;
};

const TextHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => node.type === NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const slate = _sample(node.texts);

    if (slate) {
      try {
        const sanitizedVars = sanitizeVariables(variables.getState());
        const newSlate = { id: slate.id, content: slateInjectVariables(sanitizedVars)(slate.content) };

        runtime.trace.addTrace<TraceFrame>({
          type: TraceType.TEXT,
          payload: { slate: newSlate, text: slateToPlaintext(newSlate.content) },
        });
      } catch (error) {
        log.error(error);
      }
    }

    return node.nextId ?? null;
  },
});

export default TextHandler;
