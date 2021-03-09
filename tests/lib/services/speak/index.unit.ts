import { SpeakType } from '@voiceflow/general-types/build/nodes/speak';
import { expect } from 'chai';
import sinon from 'sinon';

import SpeakManager, { utils as defaultUtils } from '@/lib/services/speak';

import { audioUrl, context, DB_VISUAL_TRACE, malformedTrace1, malformedTrace2 } from './fixture';

describe('speak manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('sets audio src and types correctly', () => {
    const speak = new SpeakManager({ utils: { ...defaultUtils } } as any, {} as any);
    const result = speak.handle(context as any);

    expect(result).to.eql({
      ...context,
      trace: [
        {
          ...malformedTrace1,
          payload: {
            ...malformedTrace1.payload,
            src: audioUrl,
            type: SpeakType.AUDIO,
          },
        },
        {
          ...malformedTrace2,
          payload: {
            ...malformedTrace2.payload,
            type: SpeakType.MESSAGE,
          },
        },
        DB_VISUAL_TRACE,
      ],
    });
  });
});
