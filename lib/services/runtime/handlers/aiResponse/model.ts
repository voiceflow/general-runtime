import { VoiceNode } from '@voiceflow/voice-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { from, tap } from 'rxjs';

import AIAssist from '@/lib/services/aiAssist';
import { Store } from '@/runtime';

import { FrameType, GeneralRuntime, Output } from '../../types';
import { getOutputTrace } from '../../utils';
import { AIResponse, consumeResources, EMPTY_AI_RESPONSE, fetchPromptStream } from '../utils/ai';
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

  const response: AIResponse = { ...EMPTY_AI_RESPONSE };

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
  );

  let startTraceSent = false;
  await promptStream$
    .pipe(
      tap((completion) => {
        if (!completion.output) return;

        runtime.trace.addTrace(
          startTraceSent ? completionToContinueTrace(completion) : completionToStartTrace(runtime, node, completion)
        );

        startTraceSent = true;
      })
    )
    .forEach((completion) => {
      if (!response.output) response.output = '';

      response.output += completion.output ?? '';
      response.answerTokens += completion.answerTokens;
      response.queryTokens += completion.queryTokens;
      response.tokens += completion.tokens;
      response.model = completion.model;
      response.multiplier = completion.multiplier;
    });

  if (startTraceSent) {
    runtime.trace.addTrace(endTrace());
  }

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
