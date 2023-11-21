import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import _cloneDeep from 'lodash/cloneDeep';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/ai-model.interface';
import { ContentModerationError } from '@/lib/clients/ai/contentModeration/utils';
import { HandlerFactory } from '@/runtime';

import { GeneralRuntime } from '../types';
import { AIResponse, checkTokens, consumeResources, EMPTY_AI_RESPONSE, fetchPrompt } from './utils/ai';
import { getKBSettings } from './utils/knowledgeBase';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;
    const projectID = runtime.project?._id;
    const generativeModel = runtime.services.ai.get(node.model);
    const kbSettings = getKBSettings(
      runtime?.services.unleash,
      workspaceID,
      runtime?.version?.knowledgeBase?.settings,
      runtime?.project?.knowledgeBase?.settings
    );
    if (!node.sets?.length) return nextID;

    if (!(await checkTokens(runtime, node.type))) return nextID;

    try {
      const result = await Promise.all(
        node.sets
          .filter((set) => !!set.prompt && !!set.variable)
          .map(
            async ({
              mode,
              prompt,
              variable,
              instruction,
            }): Promise<{ tokens: number; queryTokens: number; answerTokens: number }> => {
              const emptyResult = { tokens: 0, queryTokens: 0, answerTokens: 0 };
              if (!variable) return emptyResult;

              if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
                const isDeprecated = node.overrideParams === undefined;

                let response: AIResponse | null = EMPTY_AI_RESPONSE;
                if (isDeprecated) {
                  response = await runtime.services.aiSynthesis.DEPRECATEDpromptSynthesis(
                    runtime.version!.projectID,
                    workspaceID,
                    {
                      ...kbSettings?.summarization,
                      mode,
                      prompt,
                    },
                    variables.getState(),
                    runtime
                  );
                } else {
                  const settings = deepVariableSubstitution(
                    _cloneDeep({ ...node, mode, instruction, prompt, sets: undefined }),
                    variables.getState()
                  );
                  response = await runtime.services.aiSynthesis.knowledgeBaseQuery({
                    version: runtime.version!,
                    project: runtime.project!,
                    question: settings.prompt,
                    instruction: settings.instruction,
                    options: node.overrideParams ? { summarization: settings } : {},
                  });

                  if (response.output === null) response.output = BaseUtils.ai.KNOWLEDGE_BASE_NOT_FOUND;
                }

                variables.set(variable, response?.output);
                const tokens = response?.tokens ?? 0;
                const queryTokens = response?.queryTokens ?? 0;
                const answerTokens = response?.answerTokens ?? 0;

                return { tokens, queryTokens, answerTokens };
              }

              if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
                variables.set(variable, 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.');
                return emptyResult;
              }

              const response = await fetchPrompt(
                { ...node, prompt, mode },
                generativeModel,
                { context: { projectID, workspaceID } },
                variables.getState()
              );
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

      const kbModel = runtime.services.ai.get((node.overrideParams && node.model) || kbSettings?.summarization.model);
      const model = node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE ? kbModel : generativeModel;

      await consumeResources(
        node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE ? 'AI Set KB' : 'AI Set',
        runtime,
        model,
        { ...totals }
      );

      return nextID;
    } catch (err) {
      if (err instanceof ContentModerationError) {
        return nextID;
      }
      throw err;
    }
  },
});

export default AISetHandler;
