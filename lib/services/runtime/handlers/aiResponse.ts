/* eslint-disable max-depth */
/* eslint-disable sonarjs/cognitive-complexity */
import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import _cloneDeep from 'lodash/cloneDeep';
import _merge from 'lodash/merge';

import { GPT4_ABLE_PLAN } from '@/lib/clients/ai/ai-model.interface';
import { ContentModerationError } from '@/lib/clients/ai/contentModeration/utils';
import { HandlerFactory } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { AIResponse, checkTokens, consumeResources, EMPTY_AI_RESPONSE, fetchPrompt } from './utils/ai';
import { getKBSettings } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;
    const elseID = node.elseId ?? null;
    const projectID = runtime.project?._id;
    const workspaceID = runtime.project?.teamID;
    const generativeModel = runtime.services.ai.get(node.model);

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
        const kbSettings = getKBSettings(
          runtime?.services.unleash,
          workspaceID,
          runtime?.version?.knowledgeBase?.settings,
          runtime?.project?.knowledgeBase?.settings
        );

        // TODO: REMOVE AFTER MIGRATION OFF LEGACY AI RESPONSE STEPS
        let answer: AIResponse | null = EMPTY_AI_RESPONSE;
        const isDeprecated = node.overrideParams === undefined;
        if (isDeprecated) {
          const { prompt, mode } = node;
          answer = await runtime.services.aiSynthesis.DEPRECATEDpromptSynthesis(
            runtime.version!.projectID,
            workspaceID,
            { ...kbSettings?.summarization, prompt, mode },
            variables.getState(),
            runtime
          );

          const kbModel = runtime.services.ai.get(kbSettings?.summarization.model);
          await consumeResources('AI Response KB', runtime, kbModel, answer);
        } else {
          const settings = deepVariableSubstitution(_cloneDeep(node), variables.getState());
          const summarization = _merge(kbSettings?.summarization, settings.overrideParams ? settings : {});

          const queryAnswer = await runtime.services.aiSynthesis.knowledgeBaseQuery({
            project: runtime.project!,
            version: runtime.version!,
            question: settings.prompt,
            instruction: settings.instruction,
            options: { summarization },
          });
          // just for typescript typing purposes (AIResponse) doesn't contain "chunks"
          // remove after isDeprecated is gone
          answer = queryAnswer;

          const kbModel = runtime.services.ai.get(summarization.model);
          await consumeResources('AI Response KB', runtime, kbModel, answer);

          if (!answer.output && settings.notFoundPath) return elseID;

          runtime.trace.addTrace({
            type: 'knowledgeBase',
            payload: {
              chunks: queryAnswer.chunks?.map(({ score, documentID }) => ({
                score,
                documentID,
                documentData: runtime.project?.knowledgeBase?.documents[documentID]?.data,
              })),
              query: {
                messages: answer.messages,
                output: answer.output,
              },
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

      let response: AIResponse;
      if (node.model === BaseUtils.ai.GPT_MODEL.GPT_4 && runtime.plan && !GPT4_ABLE_PLAN.has(runtime.plan)) {
        response = {
          output: 'GPT-4 is only available on the Pro plan. Please upgrade to use this feature.',
          tokens: 0,
          queryTokens: 0,
          answerTokens: 0,
        };
      } else {
        response = await fetchPrompt(
          node,
          generativeModel,
          {
            context: { projectID, workspaceID },
          },
          variables.getState()
        );
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
      if (err instanceof ContentModerationError) {
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
