import { CompiledMessage } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

const defaultMessage: CompiledMessage = {
  variants: {
    'default:en-us': [
      {
        text: [
          {
            text: 'Hello, world!',
          },
        ],
        delay: 100,
      },
    ],
  },
};

export const mockMessageResource = mockCreatorFactory(defaultMessage);
