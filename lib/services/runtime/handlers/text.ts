import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { NodeType, TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/text';
import _sample from 'lodash/sample';

import { HandlerFactory } from '@/runtime';

const TextHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => node.type === NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const text = _sample(node.texts);

    if (text?.html) {
      const sanitizedVars = sanitizeVariables(variables.getState());
      runtime.trace.addTrace<TraceFrame>({ type: TraceType.TEXT, payload: { id: text.id, html: replaceVariables(text.html, sanitizedVars) } });
    }

    return node.nextId ?? null;
  },
});

export default TextHandler;
