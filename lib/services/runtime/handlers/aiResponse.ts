import { BaseNode } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { fetchPrompt } from './utils/ai';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

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
