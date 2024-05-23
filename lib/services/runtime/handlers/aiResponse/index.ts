import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { HandlerFactory } from '@/runtime';

import { GeneralRuntime } from '../../types';
import { addOutputTrace, getOutputTrace } from '../../utils';
import { canUseModel } from '../utils/ai';
import { generateOutput } from '../utils/output';
import { knowledgeBaseHandler } from './knowledge-base';
import { llmHandler } from './llm';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const elseID = node.elseId ?? null;

    try {
      // Exit early if the model is not available
      if (!!node.model && !canUseModel(node.model, runtime)) {
        const output = generateOutput(
          `Your plan does not have access to the model "${node.model}". Please upgrade to use this feature.`,
          runtime.project
        );

        const trace = getOutputTrace({
          output,
          ai: true,
          variables,
          version: runtime.version,
        });

        addOutputTrace(runtime, trace, { node, variables });

        return nextID;
      }

      if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
        return await knowledgeBaseHandler(runtime, node, variables, nextID, elseID);
      }

      return await llmHandler(runtime, node, variables, nextID);
    } catch (err) {
      if (err?.message?.includes('[moderation error]')) {
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
      if (err?.message?.includes('Quota exceeded')) {
        addOutputTrace(
          runtime,
          getOutputTrace({
            output: generateOutput('[token quota exceeded]', runtime.project),
            version: runtime.version,
            ai: true,
          })
        );
        runtime.trace.debug('token quota exceeded', node.type);
        return nextID;
      }
      throw err;
    }
  },
});

export default AIResponseHandler;
