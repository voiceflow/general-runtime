import { expect } from 'chai';
import sinon from 'sinon';

import RateLimit from '@/lib/middlewares/rateLimit';

describe('rateLimit middleware unit tests', () => {
  describe('verify', () => {
    describe('next called', async () => {
      it('has auth', async () => {
        const middleware = new RateLimit({} as any, {} as any);
        const req = { headers: { authorization: 'auth-key' } };
        const next = sinon.stub();

        await middleware.verify(req as any, null as any, next);

        expect(next.callCount).to.eql(1);
      });

      it('origin matches', async () => {
        const middleware = new RateLimit({} as any, { CREATOR_APP_ORIGIN: 'creator-app' } as any);
        const req = { headers: { origin: 'creator-app' } };
        const next = sinon.stub();

        await middleware.verify(req as any, null as any, next);

        expect(next.callCount).to.eql(1);
      });

      it('project source set', async () => {
        const middleware = new RateLimit({} as any, { PROJECT_SOURCE: 'project-sources' } as any);
        const req = { headers: {} };
        const next = sinon.stub();

        await middleware.verify(req as any, null as any, next);

        expect(next.callCount).to.eql(1);
      });
    });

    describe('throws', () => {
      it('no origin set and no auth', async () => {
        const middleware = new RateLimit({} as any, {} as any);
        const req = { headers: {} };

        await expect(
          middleware.verify(req as any, null as any, null as any)
        ).to.eventually.rejectedWith('Auth Key Required');
      });

      // eslint-disable-next-line sonarjs/no-identical-functions
      it('origin doesnt match and no auth', async () => {
        const middleware = new RateLimit({} as any, {} as any);
        const req = { headers: {} };

        await expect(
          middleware.verify(req as any, null as any, null as any)
        ).to.eventually.rejectedWith('Auth Key Required');
      });
    });
  });

  describe('versionConsume', () => {
    it('next called', async () => {
      const middleware = new RateLimit({} as any, {} as any);
      const consume = sinon.stub(middleware, 'consume');

      const req = { headers: { versionID: 'version-id' } };
      const res = 'res';
      const next = sinon.stub();

      await middleware.versionConsume(req as any, res as any, next);

      expect(consume.args).to.eql([
        [res, next, { isPublic: true, resource: req.headers.versionID }],
      ]);
      expect(next.callCount).to.eql(0);
    });

    it('authorized', async () => {
      const middleware = new RateLimit({} as any, {} as any);
      const consume = sinon.stub(middleware, 'consume');

      const req = { headers: { authorization: 'authkey' } };
      const res = 'res';
      const next = sinon.stub();

      await middleware.versionConsume(req as any, res as any, next);

      expect(consume.args).to.eql([
        [res, next, { isPublic: false, resource: req.headers.authorization }],
      ]);
      expect(next.callCount).to.eql(0);
    });

    it('throws', async () => {
      const middleware = new RateLimit({} as any, {} as any);
      const consume = sinon.stub(middleware, 'consume').throws(new Error('custom err'));

      const req = { headers: { versionID: 'version-id' } };
      const res = 'res';
      const next = sinon.stub();

      await expect(
        middleware.versionConsume(req as any, res as any, next as any)
      ).to.eventually.rejectedWith('custom err');

      expect(consume.args).to.eql([
        [res, next, { isPublic: true, resource: req.headers.versionID }],
      ]);
      expect(next.callCount).to.eql(0);
    });
  });
});
