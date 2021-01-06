import { expect } from 'chai';
import sinon from 'sinon';

import TTSManager, { utils as defaultUtils } from '@/lib/services/tts';

describe('tts manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passes through if no speak', async () => {
      const context = { random: 'random', trace: [{ type: 'different' }] };
      const tts = new TTSManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(await tts.handle(context as any)).to.eql(context);
    });
  });
});
