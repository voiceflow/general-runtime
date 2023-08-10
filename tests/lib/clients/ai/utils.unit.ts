import { Utils } from '@voiceflow/common';
import { expect } from 'chai';
import sinon from 'sinon';

import { delayedPromiseRace } from '@/lib/clients/ai/utils';

describe.only('ai client utils unit tests', () => {
  describe('delayedPromiseRace', () => {
    it('should directly return', async () => {
      const func = sinon.stub().onFirstCall().resolves(Utils.promise.delay(10, 'fast'));

      const result = await delayedPromiseRace(func, 20, 1);

      expect(result).to.equal('fast');
      expect(func.callCount).to.equal(1);
    });

    it('should not retry if retries is set to 0', async () => {
      const func = sinon.stub().onFirstCall().resolves(Utils.promise.delay(50, 'slow'));

      const result = await delayedPromiseRace(func, 10, 0);
      expect(result).to.equal('slow');
      expect(func.callCount).to.equal(1);
    });

    it('should timeout and retry once if first promise is too slow', async () => {
      const func = sinon
        .stub()
        .onFirstCall()
        .resolves(Utils.promise.delay(50, 'slow'))
        .onSecondCall()
        .resolves(Utils.promise.delay(10, 'fast'));

      const result = await delayedPromiseRace(func, 20, 1);
      expect(result).to.equal('fast');
      expect(func.callCount).to.equal(2);
    });

    it('should return the first promise if it resolves before the second', async () => {
      const func = sinon
        .stub()
        .onFirstCall()
        .resolves(Utils.promise.delay(50, 'slow'))
        .onSecondCall()
        .resolves(Utils.promise.delay(50, 'slow1'));

      const result = await delayedPromiseRace(func, 10, 1);
      expect(result).to.equal('slow');
      expect(func.callCount).to.equal(2);
    });

    it('should retry until max retries if promise keeps being slow', async () => {
      const func = sinon.stub().resolves(Utils.promise.delay(50, 'slow'));

      const result = await delayedPromiseRace(func, 10, 3);
      expect(result).to.equal('slow');
      expect(func.callCount).to.equal(4); // original call + 3 retries
    });

    it('should handle rejections and not retry if promise rejects immediately', async () => {
      const func = sinon.stub().rejects(new Error('Immediate failure'));

      try {
        await delayedPromiseRace(func, 10, 3);
        throw new Error('Test failed, promise should have rejected');
      } catch (err) {
        expect(err.message).to.equal('Immediate failure');
        expect(func.callCount).to.equal(1); // no retries for rejections
      }
    });
  });
});
