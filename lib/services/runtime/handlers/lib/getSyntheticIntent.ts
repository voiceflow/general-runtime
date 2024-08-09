import {
  CompiledSyntheticIntentCapture,
  PrototypeIntent,
  WithCompiledSyntheticIntentCaptureData,
} from '@voiceflow/dtos';

import { Runtime } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

export function resolveIntent(intentName: string, runtime: Runtime, raiseError: ErrorRaiser = Error) {
  const intent = runtime.version?.prototype?.model.intents.find((intent) => intent.name === intentName);
  if (!intent) {
    throw raiseError(`cannot find intent definition, versionID=${runtime.versionID}, intentName=${intentName}`);
  }

  return intent;
}

export function getSyntheticIntent(
  node: { id: string; data: WithCompiledSyntheticIntentCaptureData },
  runtime: Runtime,
  raiseError: ErrorRaiser = Error
): { intent: PrototypeIntent; capture: CompiledSyntheticIntentCapture } {
  const entry = Object.entries(node.data.intentCaptures)[0];

  if (!entry) {
    throw raiseError(
      `executing a corrupt Capture V3 step missing its synthetic intent, versionID=${runtime.versionID}, nodeID=${node.id}`
    );
  }

  const [intentName, intentCapture] = entry;

  const intent = resolveIntent(intentName, runtime, raiseError);

  return {
    intent,
    capture: intentCapture,
  };
}
