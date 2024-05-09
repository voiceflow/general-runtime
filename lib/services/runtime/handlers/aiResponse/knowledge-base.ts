import { deepVariableSubstitution } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import cloneDeep from 'lodash/cloneDeep';
import { concat, concatMap, from, isEmpty, lastValueFrom, map, NEVER, of, reduce, shareReplay } from 'rxjs';

import { FeatureFlag } from '@/lib/feature-flags';
import { Store } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../../types';
import { consumeResources, EMPTY_AI_RESPONSE } from '../utils/ai';
import { KnowledegeBaseChunk } from '../utils/knowledgeBase';
import { generateOutput } from '../utils/output';
import { getVersionDefaultVoice } from '../utils/version';
import { completionToContinueTrace, completionToStartTrace, endTrace } from './traces';

export async function knowledgeBaseHandler(
  runtime: GeneralRuntime,
  node: VoiceNode.AIResponse.Node,
  variables: Store,
  nextID: string | null,
  elseID: string | null
) {
  const settings = deepVariableSubstitution(cloneDeep(node), variables.getState());
  const summarization = settings.overrideParams ? settings : {};

  const promptStream$ = from(
    runtime.services.aiSynthesis.knowledgeBaseQueryStream({
      project: runtime.project!,
      version: runtime.version!,
      question: settings.prompt,
      instruction: settings.instruction,
      options: { summarization },
    })
  ).pipe(
    concatMap((stream) => stream),
    shareReplay()
  );

  const completion$ = concat(
    promptStream$.pipe(
      map((completion, i) =>
        i > 0 ? completionToContinueTrace(completion) : completionToStartTrace(runtime, node, completion)
      )
    ),
    promptStream$.pipe(
      isEmpty(),
      concatMap((isEmpty) => (isEmpty ? NEVER : of(endTrace())))
    )
  );

  const chunksPromise = lastValueFrom(
    promptStream$.pipe(
      reduce((acc, answer) => {
        acc.push(...(answer.chunks ?? []));
        return acc;
      }, [] as KnowledegeBaseChunk[])
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
      }, EMPTY_AI_RESPONSE)
    )
  );

  const [answer, chunks] = await Promise.all([responseConsumerPromise, chunksPromise, traceConsumerPromise]);
  const chunkStrings = chunks.map((chunk) => JSON.stringify(chunk));

  const workspaceID = Number(runtime.project?.teamID);

  if (runtime.services.unleash.client.isEnabled(FeatureFlag.VF_CHUNKS_VARIABLE, { workspaceID })) {
    variables.set(VoiceflowConstants.BuiltInVariable.VF_CHUNKS, chunkStrings);
  }

  await consumeResources('AI Response KB', runtime, answer);

  if (!answer.output && settings.notFoundPath) return elseID;

  const documents = await runtime.api.getKBDocuments(
    runtime.version!.projectID,
    chunks.map(({ documentID }) => documentID) || []
  );

  runtime.trace.addTrace({
    type: 'knowledgeBase',
    payload: {
      chunks: chunks.map(({ score, documentID }) => ({
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

  const outputString = answer?.output || 'Unable to find relevant answer.';
  const output = generateOutput(outputString, runtime.project, node.voice ?? getVersionDefaultVoice(runtime.version));

  // Set last response to entire AI response, not just a partial chunk
  variables.set(VoiceflowConstants.BuiltInVariable.LAST_RESPONSE, outputString);

  runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

  return nextID;
}
