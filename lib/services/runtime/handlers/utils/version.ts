import * as BaseTypes from '@voiceflow/base-types';

export const getVersionDefaultVoice = (
  version?: BaseTypes.BaseVersion.Version
): string | undefined => {
  return (version?.platformData?.settings as any)?.defaultVoice || undefined;
};
