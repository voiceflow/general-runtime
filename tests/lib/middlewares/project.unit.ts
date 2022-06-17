import VError from '@voiceflow/verror';
import { expect } from 'chai';
import { Request, Response } from 'express';
import sinon from 'sinon';

import Project from '@/lib/middlewares/project';
import { VersionTag } from '@/types';

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

  const liveVersion = '1';
  const devVersion = '2';

  const projectID = 'some-project-id';

  const authorization = 'VF.something.something';

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

  describe('attachVersionID', () => {
    it('does not look up alias if version ID is not an alias tag', async () => {
      // arrange
      const middleware = new Project({} as any, {} as any);

      const req = getMockRequest({ headers: { versionID: versionID1 } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0].length).to.equal(0);
      expect(req.headers.versionID).to.equal(versionID1);
    });

    it('rejects if the dataAPI cannot be instantiated', async () => {
      // arrange
      const services = {
        dataAPI: { get: sinon.stub().rejects() },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({ headers: { versionID: VersionTag.DEVELOPMENT } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });

    it('rejects if the wrong API was accessed', async () => {
      // arrange
      const services = {
        dataAPI: { get: sinon.stub().resolves({}) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({
        headers: {
          versionID: VersionTag.DEVELOPMENT,
          authorization: 'auth-key',
        },
      });
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

      const req = getMockRequest({ headers: { versionID: VersionTag.DEVELOPMENT } });
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
          liveVersion,
          devVersion,
        }),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const reqProd = getMockRequest({ headers: { versionID: VersionTag.PRODUCTION } });
      const reqDev = getMockRequest({ headers: { versionID: VersionTag.DEVELOPMENT } });

      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(reqProd, res, next);
      await middleware.resolveVersionAliasLegacy(reqDev, res, next);

      // assert
      expect(reqProd.headers.versionID).to.equal(liveVersion);
      expect(reqDev.headers.versionID).to.equal(devVersion);
    });

    it('defaults to devVersion if no versionID specified', async () => {
      // arrange
      const api = {
        getProjectUsingAuthorization: sinon.stub().resolves({
          liveVersion,
          devVersion,
        }),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({ headers: { versionID: undefined } });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.resolveVersionAlias(req, res, next);

      // assert
      expect(req.headers.versionID).to.equal(devVersion);
    });
  });

  describe('attachProjectID', () => {
    it('works', async () => {
      // arrange
      const api = {
        getVersion: sinon.stub().resolves({ projectID }),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({
        headers: {
          versionID: versionID1,
          authorization,
        },
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.attachProjectID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0].length).to.equal(0);
      expect(req.headers.projectID).to.equal(projectID);
    });

    it('rejects with missing versionID', async () => {
      // arrange
      const api = {
        getVersion: sinon.stub().resolves({ projectID }),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({
        headers: {
          versionID: undefined,
          authorization,
        },
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.attachProjectID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });

    it('rejects if API cannot be retrieved', async () => {
      // arrange
      const services = {
        dataAPI: { get: sinon.stub().rejects('some-error') },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({
        headers: {
          versionID: undefined,
          authorization,
        },
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.attachProjectID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });

    it('rejects if API cannot read the version', async () => {
      // arrange
      const api = {
        getVersion: sinon.stub().rejects(new Error('Unknown error')),
      };
      const services = {
        dataAPI: { get: sinon.stub().resolves(api) },
      };
      const middleware = new Project(services as any, {} as any);

      const req = getMockRequest({
        headers: {
          versionID: versionID1,
          authorization,
        },
      });
      const res = getMockResponse();
      const next = getMockNext();

      // act
      await middleware.attachProjectID(req, res, next);

      // assert
      expect(next.callCount).to.equal(1);
      expect(next.args[0][0]).to.be.instanceOf(VError);
    });
  });
});
