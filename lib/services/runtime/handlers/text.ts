import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { NodeType, TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/text';
import _ from 'lodash';

import { HandlerFactory } from '@/runtime';

const TextHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => node.type === NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const sanitizedVars = sanitizeVariables(variables.getState());
    node.texts.forEach(({ id, html }) => {
      runtime.trace.addTrace<TraceFrame>({ type: TraceType.TEXT, payload: { id, html: replaceVariables(html, sanitizedVars) } });
    });

    return node.nextId ?? null;
  },
});

export default TextHandler;
