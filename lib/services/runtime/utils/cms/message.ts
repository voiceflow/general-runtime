import { BaseText } from '@voiceflow/base-types';
import { Version } from '@voiceflow/dtos';

import { Runtime } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

export function getMessageData(runtime: Runtime, messageID: string, raiseError: ErrorRaiser = Error) {
  if (!runtime.version) {
    throw raiseError('Runtime was not loaded with a version');
  }

  /**
   * !TODO! - Need to replace this `as Version` cast by refactoring `general-runtime` to use the
   *          `Version` from the DTOs.
   */
  const version = runtime.version as unknown as Version;

  if (!version.programResources) {
    throw raiseError?.('Version was not compiled');
  }

  return version.programResources.messages[messageID];
}

export function getMessageText(
  runtime: Runtime,
  messageID: string,
  raiseError: ErrorRaiser = Error
): BaseText.SlateTextValue[] {
  const message = getMessageData(runtime, messageID);
  const variantsList = message.variants['default:en-us'];

  if (!variantsList) {
    throw raiseError(`could not retrieve variants list for versionID=${runtime.versionID}, messageID=${messageID}`);
  }

  const prompts: BaseText.SlateTextValue[] = variantsList.map((variant) => variant.data.text);

  return prompts;
}
