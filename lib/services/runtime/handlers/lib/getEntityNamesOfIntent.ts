import { PrototypeIntent } from '@voiceflow/dtos';

import { Runtime } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

export function getEntityNamesOfIntent(
  intent: PrototypeIntent,
  runtime: Runtime,
  raiseError: ErrorRaiser = Error
): string[] {
  const entityIDs = new Set(intent.slots?.map((slot) => slot.id) ?? []);
  const entitiesList = runtime.version?.prototype?.model.slots;

  if (!entitiesList) {
    throw raiseError(`executing a program with corrupt version missing entities list, versionID=${runtime.versionID}`);
  }

  return entitiesList.filter((entity) => entityIDs.has(entity.key)).map((entity) => entity.name);
}
