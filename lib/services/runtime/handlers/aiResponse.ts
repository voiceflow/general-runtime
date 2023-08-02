import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/types';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { AIResponse, checkTokens, consumeResources, fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const workspaceID = runtime.project?.teamID;

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

    if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
      const { prompt, mode } = node;

      const answer = await promptSynthesis(
        runtime.version!.projectID,
        workspaceID,
        { ...runtime.project?.knowledgeBase?.settings?.summarization, prompt, mode },
        variables.getState(),
        runtime
      );

      await consumeResources('AI Response KB', runtime, answer);

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

    await consumeResources('AI Response', runtime, response);

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
