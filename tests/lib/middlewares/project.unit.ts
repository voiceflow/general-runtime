import VError from '@voiceflow/verror';
import { expect } from 'chai';
import sinon from 'sinon';

import Project from '@/lib/middlewares/project';
import { CreatorDataApi } from '@/runtime';
import CreatorDataAPI from '@/runtime/lib/DataAPI/creatorDataAPI';

describe('project middleware unit tests', () => {
  describe('attachID', () => {
    const validDMAPIKey = 'VF.DM.api-key';
    const invalidDMAPIKey = 'invalid-key';

    it('throws while retrieving creator data api', async () => {
      const errMsg = 'Unspecified error';
      const services = { dataAPI: { get: sinon.stub().rejects(errMsg) } };
      const req = { headers: { authorization: invalidDMAPIKey } };

      const middleware = new Project(services as any, {} as any);

      await expect(middleware.attachID(req as any, null as any, null as any)).to.be.eventually.rejectedWith(
        `invalid API key: ${errMsg}`
      );
      expect(services.dataAPI.get.args).to.eql([[req.headers.authorization]]);
    });

    it('throws if invalid API key provided', async () => {
      const api = {};
      const services = { dataAPI: { get: sinon.stub().resolves(api) } };
      const req = { headers: { authorization: invalidDMAPIKey } };

      const middleware = new Project(services as any, {} as any);

      await expect(middleware.attachID(req as any, null as any, null as any)).to.be.eventually.rejectedWith(`invalid Dialog Manager API Key`);
    });

    it('throws if api is not an instanceof CreatorDataApi', async () => {
      const api = {};
      const services = { dataAPI: { get: sinon.stub().resolves(api) } };
      const req = { headers: { authorization: validDMAPIKey } };

      const middleware = new Project(services as any, {} as any);

      await expect(middleware.attachID(req as any, null as any, null as any)).to.be.eventually.rejectedWith(
        `version lookup only supported via Creator Data API`
      );
    });

    // it('throws if project cannot be inferred', async () => {
    //   const api = Object.create(CreatorDataApi.prototype);
    //   api.getProjectUsingAuthorization = sinon.stub().throws();
    //   const services = { dataAPI: { get: sinon.stub().resolves(api) } };
    //   const req = { headers: { authorization: validDMAPIKey } };

    //   const middleware = new Project(services as any, {} as any);

    //   await expect(middleware.attachID(req as any, null as any, null as any)).to.be.eventually.rejectedWith(`cannot infer project version, provide a specific version in the versionID header`);
    // });

    // it('throws', async () => {
    //   // Must mock `CreatorDataApi` to pass `instanceof` test
    //   const api = Object.create(CreatorDataApi.prototype);
    //   api.getVersion = sinon.stub().throws();

    //   const services = { dataAPI: { get: sinon.stub().resolves(api) } };
    //   const middleware = new Project(services as any, {} as any);

    //   const req = { headers: { authorization: 'VF.DM.api-key', versionID: 'version-id' } };
    //   await expect(middleware.attachID(req as any, null as any, null as any)).to.eventually.rejectedWith('no permissions for this version');
    //   expect(services.dataAPI.get.args).to.eql([[req.headers.authorization]]);
    //   expect(api.getVersion.args).to.eql([[req.headers.versionID]]);
    // });

    // it('calls next', async () => {
    //   const version = { projectID: 'project-id' };
    //   const api = { getVersion: sinon.stub().resolves(version) };
    //   const services = { dataAPI: { get: sinon.stub().resolves(api) } };
    //   const middleware = new Project(services as any, {} as any);

    //   const req = { headers: { authorization: 'auth', versionID: 'version-id' } };
    //   const next = sinon.stub();
    //   await middleware.attachID(req as any, null as any, next as any);

    //   expect(next.callCount).to.eql(1);
    //   expect(services.dataAPI.get.args).to.eql([[req.headers.authorization]]);
    //   expect(api.getVersion.args).to.eql([[req.headers.versionID]]);
    //   expect(req.headers).to.eql({ authorization: req.headers.authorization, projectID: version.projectID, versionID: req.headers.versionID });
    // });
  });
});
