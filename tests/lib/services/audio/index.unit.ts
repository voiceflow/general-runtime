import { SpeakType } from '@voiceflow/general-types/build/nodes/speak';
import { expect } from 'chai';
import sinon from 'sinon';

import AudioManager, { utils as defaultUtils } from '@/lib/services/audio';

import { audioUrl, context, DB_VISUAL_TRACE, malformedTrace1, malformedTrace2 } from './fixture';

describe('audio manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('sets audio src and types correctly', () => {
    const audio = new AudioManager({ utils: { ...defaultUtils } } as any, {} as any);
    const result = audio.handle(context as any);

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
            message: '',
            type: SpeakType.MESSAGE,
          },
        },
        DB_VISUAL_TRACE,
      ],
    });
  });
});
