import { expect } from 'chai';
import sinon from 'sinon';

import Project from '@/lib/middlewares/project';

describe('project middleware unit tests', () => {
  describe('attachID', () => {
    it('throws', async () => {
      const api = { getVersion: sinon.stub().throws() };
      const services = { dataAPI: { get: sinon.stub().resolves(api) } };
      const middleware = new Project(services as any, {} as any);

      const req = { headers: { authorization: 'auth', versionid: 'version-id' } };
      await expect(middleware.attachID(req as any, null as any, null as any)).to.eventually.rejectedWith('no permissions for this version');
      expect(services.dataAPI.get.args).to.eql([[req.headers.authorization]]);
      expect(api.getVersion.args).to.eql([[req.headers.versionid]]);
    });

    it('calls next', async () => {
      const version = { projectID: 'project-id' };
      const api = { getVersion: sinon.stub().resolves(version) };
      const services = { dataAPI: { get: sinon.stub().resolves(api) } };
      const middleware = new Project(services as any, {} as any);

      const req = { headers: { authorization: 'auth', versionid: 'version-id' } };
      const next = sinon.stub();
      await middleware.attachID(req as any, null as any, next as any);

      expect(next.callCount).to.eql(1);
      expect(services.dataAPI.get.args).to.eql([[req.headers.authorization]]);
      expect(api.getVersion.args).to.eql([[req.headers.versionid]]);
      expect(req.headers).to.eql({ authorization: req.headers.authorization, projectid: version.projectID, versionid: req.headers.versionid });
    });
  });
});
