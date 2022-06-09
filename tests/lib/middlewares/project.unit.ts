import VError from '@voiceflow/verror';
import { expect } from 'chai';
import { Request, Response } from 'express';
import sinon from 'sinon';

import Project from '@/lib/middlewares/project';

describe('project middleware unit tests', () => {
  const getMockRequest = <P, B, H>({ params, body, headers }: { params?: P; body?: B; headers?: H } = {}): Request<
    P,
    B,
    H
  > => ({ params, body, headers } as any);
  const getMockResponse = (): Response => ({} as any);
  const getMockNext = () => sinon.fake();

  describe('resolveVersionAlias', () => {
    it('does not look up alias if version ID is not an alias tag', async () => {
      // arrange
      const middleware = new Project({} as any, {} as any);

      const req = getMockRequest({ headers: { versionID: 'abc' } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0].length).to.equal(0);
      expect(req.headers.versionID).to.equal('abc');
    });

    it('rejects if the dataAPI cannot be instantiated', async () => {
      // arrange
      const services = {
        dataAPI: { get: sinon.stub().rejects() },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({ headers: { versionID: 'development' } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });

    it('rejects if a project cannot be found', async () => {
      // arrange
      const api = {
        getProjectUsingAuthorization: sinon.stub().rejects(),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({ headers: { versionID: 'development' } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });

    it('changes versionID based on tag', async () => {
      // arrange
      const api = {
        getProjectUsingAuthorization: sinon.stub().resolves({
          liveVersion: '1',
          devVersion: '2',
        }),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({ headers: { versionID: 'production' } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(req.headers.versionID).to.equal('1');
    });
  });
});
