import VError from '@voiceflow/verror';
import { expect } from 'chai';
import { Request, Response } from 'express';
import sinon from 'sinon';

import Project from '@/lib/middlewares/project';

describe('project middleware unit tests', () => {
  const getMockRequest = <P, RB, B, H>({ params, body, headers }: { params?: P; body?: B; headers?: H } = {}): Request<
    P,
    RB,
    B,
    H
  > => ({ params, body, headers } as any);
  const getMockResponse = (): Response => ({} as any);
  const getMockNext = () => sinon.fake();

  const versionID1 = 'xyz';
  const versionID2 = 'abc';

  describe('unifyVersionID', () => {
    it('adds versionID to header if it exists on params', async () => {
      // arrange
      const middleware = new Project({} as any, {} as any);

      const req = getMockRequest({
        headers: { versionID: versionID1 },
        params: { versionID: versionID2 },
        body: null,
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.unifyVersionID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0].length).to.equal(0);
      expect(req.headers.versionID).to.equal(versionID2);
    });

    it('does nothing if versionID is only specified on header', async () => {
      // arrange
      const middleware = new Project({} as any, {} as any);

      const req = getMockRequest({
        headers: { versionID: versionID1 },
        params: {},
        body: null,
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.unifyVersionID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0].length).to.equal(0);
      expect(req.headers.versionID).to.equal(versionID1);
    });

    it('throws error if no versionID in header or params', async () => {
      // arrange
      const middleware = new Project({} as any, {} as any);

      const req = getMockRequest({
        headers: {},
        params: {},
        body: null,
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      const result = middleware.unifyVersionID(req, res, next);

      // assert
      await expect(result).to.be.eventually.rejectedWith('Missing versionID in request');
    });
  });

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
