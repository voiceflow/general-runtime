import { expect } from 'chai';
import sinon from 'sinon';

import RateLimit from '@/lib/services/rateLimit';

describe('rateLimit manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now()); // fake Date.now
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('setHeaders', () => {
    it('works', () => {
      const service = new RateLimit({} as any, {} as any);
      const res = { setHeader: sinon.stub() };
      const rateLimiterRes = {
        remainingPoints: 100,
        msBeforeNext: 50000,
      };
      const maxPoints = 1000;

      service.setHeaders(res as any, rateLimiterRes as any, maxPoints);

      expect(res.setHeader.args).to.eql([
        ['X-RateLimit-Limit', maxPoints],
        ['X-RateLimit-Remaining', rateLimiterRes.remainingPoints],
        ['X-RateLimit-Reset', new Date(clock.now + rateLimiterRes.msBeforeNext).toString()],
      ]);
    });
  });

  describe('consume', () => {
    it('private', async () => {
      const config = { RATE_LIMITER_POINTS_PRIVATE: 1000 };
      const rateLimiterRes = { foo: 'bar' };
      const services = { rateLimiterClient: { private: { consume: sinon.stub().resolves(rateLimiterRes) } } };
      const service = new RateLimit(services as any, config as any);
      const setHeadersStub = sinon.stub();
      service.setHeaders = setHeadersStub;

      const req = { headers: { authorization: 'auth-key' } };
      const res = 'response';

      await service.consume(req as any, res as any);

      expect(services.rateLimiterClient.private.consume.args).to.eql([[req.headers.authorization]]);
      expect(setHeadersStub.args).to.eql([[res, rateLimiterRes, config.RATE_LIMITER_POINTS_PRIVATE]]);
    });

    it('public', async () => {
      const config = { RATE_LIMITER_POINTS_PUBLIC: 1000 };
      const rateLimiterRes = { foo: 'bar' };
      const services = { rateLimiterClient: { public: { consume: sinon.stub().resolves(rateLimiterRes) } } };
      const service = new RateLimit(services as any, config as any);
      const setHeadersStub = sinon.stub();
      service.setHeaders = setHeadersStub;

      const req = { headers: {}, params: { versionID: 'version-id' } };
      const res = 'response';

      await service.consume(req as any, res as any);

      expect(services.rateLimiterClient.public.consume.args).to.eql([[req.params.versionID]]);
      expect(setHeadersStub.args).to.eql([[res, rateLimiterRes, config.RATE_LIMITER_POINTS_PUBLIC]]);
    });

    it('throws', async () => {
      const config = { RATE_LIMITER_POINTS_PUBLIC: 1000 };
      const rateLimiterRes = { msBeforeNext: 50000 };
      const services = { rateLimiterClient: { public: { consume: sinon.stub().throws(rateLimiterRes) } } };
      const service = new RateLimit(services as any, config as any);
      const setHeadersStub = sinon.stub();
      service.setHeaders = setHeadersStub;

      const req = { headers: {}, params: { versionID: 'version-id' } };
      const res = { setHeader: sinon.stub() };

      await expect(service.consume(req as any, res as any)).to.eventually.rejectedWith('Too Many Request');

      expect(services.rateLimiterClient.public.consume.args).to.eql([[req.params.versionID]]);
      expect(res.setHeader.args).to.eql([['Retry-After', Math.floor(rateLimiterRes.msBeforeNext / 1000)]]);
      expect(setHeadersStub.args).to.eql([[res, rateLimiterRes, config.RATE_LIMITER_POINTS_PUBLIC]]);
    });
  });
});
