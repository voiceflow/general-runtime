import { expect } from 'chai';
import sinon from 'sinon';

import OutgoingApiLimiter from '@/runtime/lib/Runtime/OutgoingApiLimiter';

describe('Runtime OutgoingApiLimiter unit tests', () => {
  describe('makeRedisHostnameHash', () => {
    it('works', () => {
      const runtime = { getVersionID: sinon.stub().returns('version-id') };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(outgoingApiLimiter.makeRedisHostnameHash('hostname-val')).to.eql('outgoing_api_version-id_hostname-val');
    });
  });

  describe('getHostnameUses', () => {
    it('works with existing uses', async () => {
      const runtime = { getVersionID: sinon.stub().returns('version-id'), services: { redis: { get: sinon.stub().resolves('3') } } };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(await outgoingApiLimiter.getHostnameUses('hostname-val')).to.eql(3);
      expect(runtime.getVersionID.args).to.eql([[]]);
    });

    it('works with no uses', async () => {
      const runtime = { getVersionID: sinon.stub().returns('version-id'), services: { redis: { get: sinon.stub().resolves(null) } } };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(await outgoingApiLimiter.getHostnameUses('hostname-val')).to.eql(null);
      expect(runtime.getVersionID.args).to.eql([[]]);
    });
  });

  describe('addHostnameUseAndShouldThrottle', () => {
    it('works with existing uses less than max', async () => {
      const runtime = {
        getVersionID: sinon.stub().returns('version-id'),
        services: { redis: { get: sinon.stub().resolves('3'), set: sinon.stub().resolves(undefined) } },
      };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(await outgoingApiLimiter.addHostnameUseAndShouldThrottle('hostname-val')).to.eql(false);
      expect(runtime.services.redis.set.args).to.eql([['outgoing_api_version-id_hostname-val', '4', 'KEEPTTL']]);
    });

    it('works with existing uses more than max', async () => {
      const runtime = {
        getVersionID: sinon.stub().returns('version-id'),
        services: { redis: { get: sinon.stub().resolves('5001'), set: sinon.stub().resolves(undefined) } },
      };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(await outgoingApiLimiter.addHostnameUseAndShouldThrottle('hostname-val')).to.eql(true);
      expect(runtime.services.redis.set.args).to.eql([['outgoing_api_version-id_hostname-val', '5002', 'KEEPTTL']]);
    });

    it('works with no uses less', async () => {
      const runtime = {
        getVersionID: sinon.stub().returns('version-id'),
        services: { redis: { get: sinon.stub().resolves(null), set: sinon.stub().resolves(undefined) } },
      };

      const outgoingApiLimiter = new OutgoingApiLimiter(runtime as any);

      expect(await outgoingApiLimiter.addHostnameUseAndShouldThrottle('hostname-val')).to.eql(false);
      expect(runtime.services.redis.set.args).to.eql([['outgoing_api_version-id_hostname-val', '1', 'EX', 60 * 60 * 6]]);
    });
  });
});
