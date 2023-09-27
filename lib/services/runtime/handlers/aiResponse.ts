import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { ModerationError } from '@/lib/clients/ai/utils';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { AIResponse, checkTokens, consumeResources, fetchPrompt } from './utils/ai';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;
    const generativeModel = runtime.services.ai.get(node.model);
    const kbModel = runtime.services.ai.get(runtime.project?.knowledgeBase?.settings?.summarization.model);

    if (!(await checkTokens(runtime, node.type))) {
      addOutputTrace(
        runtime,
        getOutputTrace({
          output: generateOutput('[token quota exceeded]', runtime.project),
          version: runtime.version,
          ai: true,
        })
      );
      return nextID;
    }

    try {
      if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
        const { prompt, mode } = node;

        const answer = await runtime.services.aiSynthesis.promptSynthesis(
          runtime.version!.projectID,
          workspaceID,
          { ...runtime.project?.knowledgeBase?.settings?.summarization, prompt, mode },
          variables.getState(),
          runtime
        );

        await consumeResources('AI Response KB', runtime, kbModel, answer);

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
        response = await fetchPrompt(node, generativeModel, variables.getState());
      }

      await consumeResources('AI Response', runtime, generativeModel, response);

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
    } catch (err) {
      if (err instanceof ModerationError) {
        addOutputTrace(
          runtime,
          getOutputTrace({
            output: generateOutput(err.message, runtime.project),
            version: runtime.version,
            ai: true,
          })
        );
        return nextID;
      }
      throw err;
    }
  },
});

export default AIResponseHandler;
