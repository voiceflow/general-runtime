import { CompiledResponseNode, NodeType } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

import { ID } from '../version/version.mock';

const defaultNode: CompiledResponseNode = {
  id: '664cc26e33c3a959f67ca54e',
  type: NodeType.RESPONSE,
  data: {
    responseID: ID.responseID,
  },
  ports: {
    default: '664cc26e33c3a959f67ca54a',
  },
};

export const mockResponseNode = mockCreatorFactory(defaultNode);
