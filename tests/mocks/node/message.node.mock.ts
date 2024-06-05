import { CompiledMessageNode, NodeType } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

import { ID } from '../version/version.mock';

const defaultNode: CompiledMessageNode = {
  id: '664cc26e33c3a959f67ca54e',
  type: NodeType.MESSAGE,
  data: {
    messageID: ID.messageID,
  },
  ports: {
    default: '664cc26e33c3a959f67ca54a',
  },
};

export const mockMessageNode = mockCreatorFactory(defaultNode);
