import { CompletionPrivateHTTPControllerGenerateChatCompletionStream200 as ChatCompletionStream } from '@voiceflow/sdk-http-ml-gateway/generated';
import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { concat, filter, from, isEmpty, lastValueFrom, map, NEVER, of, reduce, shareReplay, switchMap } from 'rxjs';

import AIAssist from '@/lib/services/aiAssist';
import { Store } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../../types';
import { getOutputTrace } from '../../utils';
import { AIResponse, consumeResources, fetchPromptStream } from '../utils/ai';
import { generateOutput } from '../utils/output';
import { getVersionDefaultVoice } from '../utils/version';
import { completionToContinueTrace, completionToStartTrace, endTrace } from './traces';

export async function modelHandler(
  runtime: GeneralRuntime,
  node: VoiceNode.AIResponse.Node,
  variables: Store,
  nextID: string | null
) {
  const projectID = runtime.project?._id;
  const workspaceID = runtime.project?.teamID || '';

  // Create a stream of LLM responses
  const promptStream$ = from(
    fetchPromptStream(
      node,
      runtime.services.mlGateway,
      {
        context: { projectID, workspaceID },
      },
      variables.getState()
    )
  ).pipe(shareReplay());

  // Convert LLM responses to completion traces
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

  // Add completion traces to runtime, consuming `completion$` stream
  const traceConsumerPromise = completion$.forEach((trace) => runtime.trace.addTrace(trace));

  // Combine all LLM responses into a single `AIResponse`
  const responseConsumerPromise = lastValueFrom(
    promptStream$.pipe(
      reduce<ChatCompletionStream, AIResponse>(
        (acc, completion) => {
          if (!acc.output) acc.output = '';

          acc.output += completion.output ?? '';
          acc.answerTokens += completion.answerTokens;
          acc.queryTokens += completion.queryTokens;
          acc.tokens += completion.tokens;
          acc.model = completion.model;
          acc.multiplier = completion.multiplier;
          return acc;
        },
        {
          output: '',
          tokens: 0,
          queryTokens: 0,
          answerTokens: 0,
          model: node.model ?? '',
          multiplier: 1,
        }
      )
    )
  );

  const [response] = await Promise.all([responseConsumerPromise, traceConsumerPromise]);

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
}
