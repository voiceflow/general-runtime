/* eslint-disable sonarjs/cognitive-complexity */
import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _cloneDeep from 'lodash/cloneDeep';

import { FeatureFlag } from '@/lib/feature-flags';
import { HandlerFactory } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { AIResponse, canUseModel, consumeResources, fetchPrompt } from './utils/ai';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const elseID = node.elseId ?? null;
    const projectID = runtime.project?._id;
    const workspaceID = runtime.project?.teamID || '';

    try {
      if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
        const settings = deepVariableSubstitution(_cloneDeep(node), variables.getState());
        const summarization = settings.overrideParams ? settings : {};

        const answer = await runtime.services.aiSynthesis.knowledgeBaseQuery({
          project: runtime.project!,
          version: runtime.version!,
          question: settings.prompt,
          instruction: settings.instruction,
          options: { summarization },
        });

        const chunks = answer?.chunks?.map((chunk) => JSON.stringify(chunk)) ?? [];
        const workspaceID = Number(runtime.project?.teamID);

        if (runtime.services.unleash.client.isEnabled(FeatureFlag.VF_CHUNKS_VARIABLE, { workspaceID })) {
          variables.set(VoiceflowConstants.BuiltInVariable.VF_CHUNKS, chunks);
        }

        await consumeResources('AI Response KB', runtime, answer);

        if (!answer.output && settings.notFoundPath) return elseID;

        const documents = await runtime.api.getKBDocuments(
          runtime.version!.projectID,
          answer.chunks?.map(({ documentID }) => documentID) || []
        );

        runtime.trace.addTrace({
          type: 'knowledgeBase',
          payload: {
            chunks: answer.chunks?.map(({ score, documentID }) => ({
              score,
              documentID,
              documentData: documents[documentID]?.data,
            })),
            query: {
              messages: answer.messages,
              output: answer.output,
            },
          },
        });

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
      if (node.model && !canUseModel(node.model, runtime)) {
        response = {
          output: 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
          tokens: 0,
          queryTokens: 0,
          answerTokens: 0,
          model: node.model,
          multiplier: 1,
        };
      } else {
        response = await fetchPrompt(
          node,
          runtime.services.mlGateway,
          {
            context: { projectID, workspaceID },
          },
          variables.getState()
        );
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
