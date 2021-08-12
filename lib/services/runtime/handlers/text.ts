import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { NodeType, TraceType } from '@voiceflow/general-types';
import { Descendant, Node, TraceFrame } from '@voiceflow/general-types/build/nodes/text';
import _sample from 'lodash/sample';
import { Text } from 'slate';

import { HandlerFactory } from '@/runtime';

const TextHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => node.type === NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const slate = _sample(node.texts);
    const sanitizedVars = sanitizeVariables(variables.getState());

    let text = '';
    const injectVariables = (content: Descendant[]) => {
      content.map((n) => {
        if (Text.isText(n)) {
          const newText = replaceVariables(n.text, sanitizedVars);
          text += newText;
          n.text = newText;
        } else {
          injectVariables(n.children);
        }
      });
    };

    if (slate) {
      injectVariables(slate.content);
      runtime.trace.addTrace<TraceFrame>({ type: TraceType.TEXT, payload: { slate, text } });
    }

    return node.nextId ?? null;
  },
});

export default TextHandler;
