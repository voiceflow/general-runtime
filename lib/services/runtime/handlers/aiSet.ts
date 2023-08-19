import { BaseNode, BaseUtils } from '@voiceflow/base-types';

import AI from '@/lib/clients/ai';
import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { HandlerFactory } from '@/runtime';

import { checkTokens, consumeResources, fetchPrompt } from './utils/ai';
import { knowledgeBaseInteract } from './utils/knowledgeBase';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const generativeModel = AI.get(node.model);
    const kbModel = AI.get(runtime.project?.knowledgeBase?.settings?.summarization.model);

    if (!node.sets?.length) return nextID;

    if (!(await checkTokens(runtime, node.type))) return nextID;

    const result = await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(
          async ({
            prompt,
            variable,
            mode,
          }): Promise<{ tokens: number; queryTokens: number; answerTokens: number }> => {
            const emptyResult = { tokens: 0, queryTokens: 0, answerTokens: 0 };
            if (!variable) return emptyResult;

            if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
              const response = await knowledgeBaseInteract(runtime, {
                ...runtime.project?.knowledgeBase?.settings?.summarization,
                mode: BaseUtils.ai.PROMPT_MODE.PROMPT,
                prompt,
              });

              variables.set(variable, response?.output ?? '[not found]');
              const tokens = response?.tokens ?? 0;
              const queryTokens = response?.queryTokens ?? 0;
              const answerTokens = response?.answerTokens ?? 0;

              return { tokens, queryTokens, answerTokens };
            }

            if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
              variables.set(variable!, 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.');
              return emptyResult;
            }

            const response = await fetchPrompt({ ...node, prompt, mode }, variables.getState());
            const tokens = response?.tokens ?? 0;
            const queryTokens = response?.queryTokens ?? 0;
            const answerTokens = response?.answerTokens ?? 0;

            variables.set(variable!, response.output);

            return { tokens, queryTokens, answerTokens };
          }
        )
    );

    const totals = result.reduce(
      (acc, curr) => {
        acc.tokens += curr.tokens;
        acc.queryTokens += curr.queryTokens;
        acc.answerTokens += curr.answerTokens;

        return acc;
      },
      { tokens: 0, queryTokens: 0, answerTokens: 0 }
    );

    const model = node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE ? kbModel : generativeModel;

    await consumeResources('AI Set', runtime, model, { ...totals });

    return nextID;
  },
});

export default AISetHandler;
