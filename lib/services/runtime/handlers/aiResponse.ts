import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { VoiceNode } from '@voiceflow/voice-types';

import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';
import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;

    if (!(await runtime.services.billing.checkQuota(workspaceID, 'OpenAI Tokens'))) {
      throw new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

    if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
      const { prompt, mode } = node;
      const answer = await promptSynthesis(
        runtime.version!.projectID,
        { ...runtime.project?.knowledgeBase?.settings?.summarization, prompt, mode },
        variables.getState()
      );

      if (answer && typeof answer.tokens === 'number' && answer.tokens > 0) {
        await runtime.services.billing.consumeQuota(workspaceID, 'OpenAI Tokens', answer.tokens);
      }

      if (answer?.output) {
        runtime.trace.addTrace({
          type: 'knowledgeBase',
          payload: {
            chunks: answer.chunks.map(({ score, documentID }) => ({
              score,
              documentID,
              documentData: runtime.project?.knowledgeBase?.documents[documentID]?.data,
            })),
            query: answer.query,
          },
        } as any);
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

    if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
      throw new VError('Plan does not support GPT-4', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

    const response = await fetchPrompt(node, variables.getState());

    if (typeof response.tokens === 'number' && response.tokens > 0) {
      await runtime.services.billing.consumeQuota(workspaceID, 'OpenAI Tokens', response.tokens);
    }

    if (!response.output) return nextID;

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
