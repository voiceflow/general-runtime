import { CompiledMessage } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

const defaultMessage: CompiledMessage = {
  variants: {
    'default:en-us': [
      {
        data: {
          text: {
            id: 'su9b3lcm',
            content: [
              {
                children: [
                  {
                    text: 'Hello, world!',
                  },
                ],
              },
            ],
          },
          delay: 100,
        },
        condition: null,
      },
    ],
  },
};

export const mockMessageResource = mockCreatorFactory(defaultMessage);
