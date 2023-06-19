import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { fetchPrompt } from './utils/ai';
import { promptSynthesis } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
      const { prompt, mode } = node;
      const answer = await promptSynthesis(
        runtime.version!.projectID,
        { ...runtime.project?.knowledgeBase?.settings?.summarization, prompt, mode },
        variables.getState()
      );

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

    const response = await fetchPrompt(node, variables.getState());

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
