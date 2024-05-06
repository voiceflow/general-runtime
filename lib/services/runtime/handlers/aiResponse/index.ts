/* eslint-disable sonarjs/cognitive-complexity */
import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import { CompletionPrivateHTTPControllerGenerateChatCompletionStream200 } from '@voiceflow/sdk-http-ml-gateway/generated';
import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _cloneDeep from 'lodash/cloneDeep';
import {
  concat,
  filter,
  from,
  isEmpty,
  lastValueFrom,
  map,
  NEVER,
  Observable,
  of,
  reduce,
  shareReplay,
  switchMap,
} from 'rxjs';

import { FeatureFlag } from '@/lib/feature-flags';
import AIAssist from '@/lib/services/aiAssist';
import { HandlerFactory } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../../types';
import { addOutputTrace, getOutputTrace } from '../../utils';
import { AIResponse, canUseModel, consumeResources, fetchPromptStream } from '../utils/ai';
import { generateOutput } from '../utils/output';
import { getVersionDefaultVoice } from '../utils/version';
import { completionToContinueTrace, completionToStartTrace, endTrace } from './traces';

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

      let promptStream$: Observable<CompletionPrivateHTTPControllerGenerateChatCompletionStream200>;
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
        promptStream$ = from([response]);
      } else {
        response = {
          output: '',
          tokens: 0,
          queryTokens: 0,
          answerTokens: 0,
          model: node.model ?? '',
          multiplier: 1,
        };
        promptStream$ = from(
          fetchPromptStream(
            node,
            runtime.services.mlGateway,
            {
              context: { projectID, workspaceID },
            },
            variables.getState()
          )
        ).pipe(shareReplay());
      }
      const completion$ = concat(
        promptStream$.pipe(
          filter((completion) => completion.output != null),
          map((completion, i) =>
            i > 0 ? completionToContinueTrace(completion) : completionToStartTrace(runtime, node, completion)
          )
        ),
        promptStream$.pipe(
          isEmpty(),
          switchMap((isEmpty) => (isEmpty ? NEVER : of(endTrace())))
        )
      );

      const traceConsumerPromise = completion$.forEach((trace) => runtime.trace.addTrace(trace));

      const responseConsumerPromise = lastValueFrom(
        promptStream$.pipe(
          reduce((acc, completion) => {
            if (!acc.output) acc.output = '';

            acc.output += completion.output ?? '';
            acc.answerTokens += completion.answerTokens;
            acc.queryTokens += completion.queryTokens;
            acc.tokens += completion.tokens;
            acc.model = completion.model;
            acc.multiplier = completion.multiplier;
            return acc;
          }, response)
        )
      );

      [response] = await Promise.all([responseConsumerPromise, traceConsumerPromise]);

      await consumeResources('AI Response', runtime, response);

      if (!response.output) return nextID;

      const output = generateOutput(
        response.output,
        runtime.project,
        // use default voice if voice doesn't exist
        node.voice ?? getVersionDefaultVoice(runtime.version)
      );

      // Inject final output for memory
      AIAssist.injectOutput(
        variables,
        getOutputTrace({
          output,
          variables,
          version: runtime.version,
          ai: true,
        })
      );

      // Set last response to entire AI response, not just a partial chunk
      variables.set(VoiceflowConstants.BuiltInVariable.LAST_RESPONSE, response.output);

      runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

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
