import { expect } from 'chai';
import sinon from 'sinon';

import DialogManager, { utils as defaultUtils } from '@/lib/services/dialog';

describe('dialog manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passing through', async () => {
      const asr = new DialogManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(asr.handle('a' as any)).to.eq('a');
    });
  });
});
