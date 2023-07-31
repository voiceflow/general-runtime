import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { QuotaName } from '@/lib/services/billing';
import log from '@/logger';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { AIResponse, fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;

    if (!(await runtime.services.billing.checkQuota(workspaceID, QuotaName.OPEN_API_TOKENS))) {
      addOutputTrace(
        runtime,
        getOutputTrace({
          output: generateOutput('[token quota exceeded]', runtime.project),
          version: runtime.version,
          ai: true,
        })
      );
      runtime.trace.debug('token quota exceeded', BaseNode.NodeType.AI_RESPONSE);
      return nextID;
    }

    if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
      const { prompt, mode } = node;

      const answer = await promptSynthesis(
        runtime.version!.projectID,
        workspaceID,
        { ...runtime.project?.knowledgeBase?.settings?.summarization, prompt, mode },
        variables.getState(),
        runtime
      );

      if (answer && typeof answer.tokens === 'number' && answer.tokens > 0) {
        await runtime.services.billing
          .consumeQuota(workspaceID, QuotaName.OPEN_API_TOKENS, answer.tokens)
          .catch((err: Error) =>
            log.error(`[AI Response KB] Error consuming quota for workspace ${workspaceID}: ${log.vars({ err })}`)
          );
      }

      const output = generateOutput(
        answer?.output || 'Unable to find relevant answer.',
        runtime.project,
        node.voice ?? getVersionDefaultVoice(runtime.version)
      );

      addOutputTrace(
        runtime,
        getOutputTrace({
          output,
          variables,
          version: runtime.version,
          ai: true,
        }),
        { variables }
      );

      return nextID;
    }

    let response: AIResponse;
    if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
      response = {
        output: 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
        tokens: 0,
        queryTokens: 0,
        answerTokens: 0,
      };
    } else {
      response = await fetchPrompt(node, variables.getState());
    }

    if (typeof response.tokens === 'number' && response.tokens > 0) {
      await runtime.services.billing
        .consumeQuota(workspaceID, QuotaName.OPEN_API_TOKENS, response.tokens)
        .catch((err: Error) => log.error(`[AI Response] Error consuming quota: ${log.vars({ err })}`));
    }

    if (!response.output) return nextID;

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

    const output = generateOutput(
      response.output,
      runtime.project,
      // use default voice if voice doesn't exist
      node.voice ?? getVersionDefaultVoice(runtime.version)
    );

    runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

    addOutputTrace(
      runtime,
      getOutputTrace({
        output,
        variables,
        version: runtime.version,
        ai: true,
      }),
      { variables }
    );

    return nextID;
  },
});

export default AIResponseHandler;
