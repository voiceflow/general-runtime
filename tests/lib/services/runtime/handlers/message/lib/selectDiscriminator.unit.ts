import { Channel, CompiledMessage, Language } from '@voiceflow/dtos';
import { expect } from 'chai';

import { selectDiscriminator } from '@/lib/services/runtime/handlers/message/lib/selectDiscriminator';

describe('selectDiscriminator', () => {
  it('works', () => {
    const message: CompiledMessage = {
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
                        text: 'Default EN-US',
                      },
                    ],
                  },
                ],
              },
              delay: 137,
            },
            condition: null,
          },
        ],
        [`channel:language` as any]: [
          {
            data: {
              text: {
                id: 'su9b3lcm',
                content: [
                  {
                    children: [
                      {
                        text: 'Channel Language',
                      },
                    ],
                  },
                ],
              },
              delay: 237,
            },
            condition: null,
          },
        ],
      },
    };

    const variants = selectDiscriminator(message, Channel.DEFAULT, Language.ENGLISH_US);

    expect(variants).to.not.eq(undefined);
    expect(variants![0].data.text.content[0].children[0].text).to.eql('Default EN-US');
  });
});
