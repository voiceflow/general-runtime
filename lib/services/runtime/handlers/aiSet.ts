import { BaseNode } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

import { fetchPrompt } from './utils/ai';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  handle: async (node, _, variables) => {
    const nextID = node.nextId ?? null;

    if (!node.sets?.length) return nextID;

    await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(async ({ prompt, variable, ...set }) => {
          variables.set(variable!, await fetchPrompt({ ...node, mode: (set as any).mode, prompt }, variables));
        })
    );

    return nextID;
  },
});

export default AISetHandler;
