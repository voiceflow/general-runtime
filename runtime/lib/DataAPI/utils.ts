import { BaseModels } from '@voiceflow/base-types';

export const extractAPIKeyID = (key: unknown): string => {
  if (BaseModels.ApiKey.isWorkspaceAPIKey(key) || BaseModels.ApiKey.isDialogManagerAPIKey(key)) {
    return key.split('.')[2];
  }
  // Handle legacy workspace API keys: "VF.<id>.<key>"
  if (typeof key === 'string' && key.startsWith(BaseModels.ApiKey.API_KEY_PREFIX)) {
    return key.split('.')[1];
  }
  throw new Error('Cannot extract the ID from an unknown API Key');
};
