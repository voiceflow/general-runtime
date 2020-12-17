import { expect } from 'chai';
import sinon from 'sinon';

import TTSManager, { utils as defaultUtils } from '@/lib/services/tts';

describe('tts manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passing through', async () => {
      const asr = new TTSManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(asr.handle('a' as any)).to.eq('a');
    });
  });
});
