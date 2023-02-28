import { BaseModels } from '@voiceflow/base-types';

export const extractAPIKeyID = (key: unknown): string => {
  if (BaseModels.ApiKey.isWorkspaceAPIKey(key) || BaseModels.ApiKey.isDialogManagerAPIKey(key)) {
    return key.split('.')[2];
  }
  throw new Error('Cannot extract the ID from an unknown API Key');
};
