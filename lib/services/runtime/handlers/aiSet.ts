import { BaseNode, BaseUtils } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

import { fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (!node.sets?.length) return nextID;

    await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(async ({ prompt, variable, mode }) => {
          if (!variable) return;

          if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
            variables.set(
              variable,
              (
                await promptSynthesis(
                  runtime.version!.projectID,
                  {
                    ...runtime.project?.knowledgeBase?.settings?.summarization,
                    mode,
                    prompt,
                  },
                  variables.getState()
                )
              )?.output
            );
            return;
          }

          variables.set(variable!, (await fetchPrompt({ ...node, prompt, mode }, variables.getState())).output);
        })
    );

    return nextID;
  },
});

export default AISetHandler;
