import { Version } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

import { mockMessageResource } from '../cms-resource/message.mock';

export const ID = {
  versionID: '664cc26e33c3a959f67ca54e',
  messageID: '664cc26e33c3a959f67ca549',
};

const defaultVersion: Version = {
  _id: ID.versionID,
  _version: 1,
  name: 'Version name',
  creatorID: 1,
  projectID: '643872531e80120007759e05',
  rootDiagramID: '664cc26e33c3a959f67ca550',
  variables: ['variable-1', 'variable-2', 'variable-3'],
  platformData: {
    slots: [],
    intents: [],
    settings: {},
    publishing: {},
  },
  programResources: {
    messages: {
      [ID.messageID]: mockMessageResource(),
    },
  },
};

export const mockVersion = mockCreatorFactory(defaultVersion);
