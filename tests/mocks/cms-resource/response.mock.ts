import { CardLayout, CompiledResponse, ResponseVariantType } from '@voiceflow/dtos';

import { mockCreatorFactory } from '@/tests/utils/createMock';

const defaultResponse: CompiledResponse = {
  variants: {
    'default:en-us': [
      {
        id: '643872531e80120007759e05',
        type: ResponseVariantType.TEXT,
        data: {
          text: [
            {
              text: 'Hello, world!',
            },
          ],
          speed: 100,
          cardLayout: CardLayout.LIST,
        },
      },
    ],
  },
};

export const mockResponseResource = mockCreatorFactory(defaultResponse);
