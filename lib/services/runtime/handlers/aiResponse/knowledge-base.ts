/* eslint-disable sonarjs/cognitive-complexity */
import { deepVariableSubstitution } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import cloneDeep from 'lodash/cloneDeep';
import { catchError, concatMap, EMPTY, from, tap } from 'rxjs';

import { FeatureFlag } from '@/lib/feature-flags';
import { BufferedReducerStopException } from '@/lib/services/aiSynthesis/buffer-reduce.exception';
import { KBResponse } from '@/lib/services/aiSynthesis/types';
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

  const answer: KBResponse = { ...EMPTY_AI_RESPONSE, chunks: [] };
  let chunks: KnowledegeBaseChunk[] = [];

  const kbStream$ = from(
    runtime.services.aiSynthesis.knowledgeBaseQueryStream({
      project: runtime.project!,
      version: runtime.version!,
      question: settings.prompt,
      instruction: settings.instruction,
      options: { summarization },
    })
  ).pipe(concatMap((stream) => stream));

  let startTraceSent = false;
  await kbStream$
    .pipe(
      tap((completion) => {
        if (!completion.output) return;

        runtime.trace.addTrace(
          startTraceSent ? completionToContinueTrace(completion) : completionToStartTrace(runtime, node, completion)
        );

        startTraceSent = true;
      }),
      catchError((err) => {
        if (err instanceof BufferedReducerStopException) {
          return EMPTY;
        }
        throw err;
      })
    )
    .forEach((completion) => {
      if (!answer.output) answer.output = '';

      answer.output += completion.output ?? '';
      answer.answerTokens += completion.answerTokens;
      answer.queryTokens += completion.queryTokens;
      answer.tokens += completion.tokens;
      answer.model = completion.model;
      answer.multiplier = completion.multiplier;

      chunks = chunks.concat(completion.chunks ?? []);
    });

  if (startTraceSent) {
    runtime.trace.addTrace(endTrace());
  }

  if (!answer.output) return settings.notFoundPath ? elseID : nextID;

  const chunkStrings = chunks.map((chunk) => JSON.stringify(chunk));

  const workspaceID = Number(runtime.project?.teamID);

  if (runtime.services.unleash.client.isEnabled(FeatureFlag.VF_CHUNKS_VARIABLE, { workspaceID })) {
    variables.set(VoiceflowConstants.BuiltInVariable.VF_CHUNKS, chunkStrings);
  }

  await consumeResources('AI Response KB', runtime, answer);

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
