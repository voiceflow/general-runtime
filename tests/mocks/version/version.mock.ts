import { Version } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

import { mockResponseResource } from '../cms-resource/response.mock';

export const ID = {
  versionID: '664cc26e33c3a959f67ca54e',
  responseID: '664cc26e33c3a959f67ca549',
};

const defaultVersion: Version = {
  _id: ID.versionID,
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
    responses: {
      [ID.responseID]: mockResponseResource(),
    },
    attachments: {},
  },
};

export const mockVersion = mockCreatorFactory(defaultVersion);
