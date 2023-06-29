import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';

import { HandlerFactory } from '@/runtime';

import { fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;

    if (!node.sets?.length) return nextID;

    if (!(await runtime.services.billing.checkQuota(workspaceID, 'OpenAI Tokens'))) {
      throw new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

    const result = await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(async ({ prompt, variable, mode }): Promise<number> => {
          if (!variable) return 0;

          if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
            const response = await promptSynthesis(
              runtime.version!.projectID,
              {
                ...runtime.project?.knowledgeBase?.settings?.summarization,
                mode,
                prompt,
              },
              variables.getState()
            );

            variables.set(variable, response?.output);
            return response?.tokens ?? 0;
          }

          const response = await fetchPrompt({ ...node, prompt, mode }, variables.getState());

          variables.set(variable!, response.output);

          return response.tokens ?? 0;
        })
    );

    const tokens = result.reduce((acc, curr) => acc + curr, 0);

    if (typeof tokens === 'number' && tokens > 0) {
      await runtime.services.billing.consumeQuota(workspaceID, 'OpenAI Tokens', tokens);
    }

    return nextID;
  },
});

export default AISetHandler;
