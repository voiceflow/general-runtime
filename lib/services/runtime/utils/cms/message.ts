import { Version } from '@voiceflow/dtos';

import { Runtime } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

export function getMessageData(runtime: Runtime, messageID: string, errorRaiser?: ErrorRaiser) {
  if (!runtime.version) {
    throw errorRaiser?.('Runtime was not loaded with a version');
  }

  /**
   * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
   *          `Version` from the DTOs.
   */
  const version = runtime.version as unknown as Version;

  if (!version.programResources) {
    throw errorRaiser?.('Version was not compiled');
  }

  return version.programResources.messages[messageID];
}
