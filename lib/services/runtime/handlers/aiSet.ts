import { BaseNode, BaseUtils } from '@voiceflow/base-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { HandlerFactory } from '@/runtime';

import { checkTokens, consumeResources, fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;

    if (!node.sets?.length) return nextID;

    if (!(await checkTokens(runtime, node.type))) return nextID;

    const result = await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(async ({ prompt, variable, mode }): Promise<number> => {
          if (!variable) return 0;

          if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
            const response = await promptSynthesis(
              runtime.version!.projectID,
              workspaceID,
              {
                ...runtime.project?.knowledgeBase?.settings?.summarization,
                mode,
                prompt,
              },
              variables.getState(),
              runtime
            );

            variables.set(variable, response?.output);
            return response?.tokens ?? 0;
          }

          if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
            variables.set(variable!, 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.');
            return 0;
          }

          const response = await fetchPrompt({ ...node, prompt, mode }, variables.getState());

          runtime.trace.addTrace({
            type: 'genAI',
            payload: {
              output: response.output,
              tokenInfo: {
                tokens: response.tokens,
                queryTokens: response.queryTokens,
                answerTokens: response.answerTokens,
              },
            },
          } as any);

          variables.set(variable!, response.output);

          return response.tokens ?? 0;
        })
    );

    const tokens = result.reduce((acc, curr) => acc + curr, 0);
    await consumeResources('AI Set', runtime, { tokens });

    return nextID;
  },
});

export default AISetHandler;
