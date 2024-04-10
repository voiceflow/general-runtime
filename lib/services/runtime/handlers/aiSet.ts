import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _cloneDeep from 'lodash/cloneDeep';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/ai-model.interface';
import { FeatureFlag } from '@/lib/feature-flags';
import { HandlerFactory } from '@/runtime';

import { GeneralRuntime } from '../types';
import { AIResponse, consumeResources, EMPTY_AI_RESPONSE, fetchPrompt } from './utils/ai';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID || '';
    const projectID = runtime.project?._id;
    if (!node.sets?.length) return nextID;

    try {
      const result = await Promise.all(
        node.sets
          .filter((set) => !!set.prompt && !!set.variable)
          .map(async ({ mode, prompt, variable, instruction }): Promise<AIResponse> => {
            if (!variable) return EMPTY_AI_RESPONSE;

            if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
              const settings = deepVariableSubstitution(
                _cloneDeep({ ...node, mode, instruction, prompt, sets: undefined }),
                variables.getState()
              );

              const response = await runtime.services.aiSynthesis.knowledgeBaseQuery({
                version: runtime.version!,
                project: runtime.project!,
                question: settings.prompt,
                instruction: settings.instruction,
                options: node.overrideParams ? { summarization: settings } : {},
              });

              const chunks = response?.chunks?.map((chunk) => JSON.stringify(chunk)) ?? [];
              const workspaceID = Number(runtime.project?.teamID);

              if (
                runtime.services.unleash.client.isEnabled(FeatureFlag.VF_CHUNKS_VARIABLE, {
                  workspaceID,
                })
              ) {
                variables.set(VoiceflowConstants.BuiltInVariable.VF_CHUNKS, chunks);
              }

              if (response.output === null) response.output = BaseUtils.ai.KNOWLEDGE_BASE_NOT_FOUND;

              variables.set(variable, response?.output);
              const tokens = response?.tokens ?? 0;
              const queryTokens = response?.queryTokens ?? 0;
              const answerTokens = response?.answerTokens ?? 0;

              return { ...EMPTY_AI_RESPONSE, ...response, tokens, queryTokens, answerTokens };
            }

            if (
              node.model === BaseUtils.ai.GPT_MODEL.GPT_4 &&
              runtime.plan &&
              !GPT4_ABLE_PLAN.has(runtime.plan)
            ) {
              variables.set(
                variable,
                'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.'
              );
              return EMPTY_AI_RESPONSE;
            }

            const response = await fetchPrompt(
              { ...node, prompt, mode },
              runtime.services.mlGateway,
              { context: { projectID, workspaceID } },
              variables.getState()
            );
            const tokens = response?.tokens ?? 0;
            const queryTokens = response?.queryTokens ?? 0;
            const answerTokens = response?.answerTokens ?? 0;

            variables.set(variable!, response.output);

            return { ...response, tokens, queryTokens, answerTokens };
          })
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

      await consumeResources(
        node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE ? 'AI Set KB' : 'AI Set',
        runtime,
        { ...result[0], ...totals }
      );

      return nextID;
    } catch (err) {
      if (err?.message?.includes('[moderation error]')) {
        return nextID;
      }
      if (err?.message?.includes('Quota exceeded')) {
        runtime.trace.debug('token quota exceeded', node.type);
        return nextID;
      }
      throw err;
    }
  },
});

export default AISetHandler;
