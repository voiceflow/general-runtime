import { expect } from 'chai';
import sinon from 'sinon';

import StateManagement from '@/lib/controllers/stateManagement';

describe('stateManagement controller unit tests', () => {
  describe('interact', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { stateManagement: { interact: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: {}, body: {} };
      expect(await controller.interact(req as any)).to.eql(output);
      expect(services.stateManagement.interact.args).to.eql([[req]]);
    });
  });

  describe('get', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { session: { getFromDb: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: { projectid: 'project-id', versionid: 'version-id' }, params: { userID: 'user-id' }, body: {} };
      expect(await controller.get(req as any)).to.eql(output);
      expect(services.session.getFromDb.args).to.eql([[req.headers.projectid, req.params.userID]]);
    });
  });

  describe('update', () => {
    it('works', async () => {
      const services = { session: { saveToDb: sinon.stub().resolves() } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: { projectid: 'project-id', versionid: 'version-id' }, params: { userID: 'user-id' }, body: { foo: 'bar' } };
      expect(await controller.update(req as any)).to.eql(req.body);
      expect(services.session.saveToDb.args).to.eql([[req.headers.projectid, req.params.userID, req.body]]);
    });
  });

  describe('delete', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { session: { deleteFromDb: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: { projectid: 'project-id', versionid: 'version-id' }, params: { userID: 'user-id' }, body: {} };
      expect(await controller.delete(req as any)).to.eql(output);
      expect(services.session.deleteFromDb.args).to.eql([[req.headers.projectid, req.params.userID]]);
    });
  });

  describe('reset', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { stateManagement: { reset: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: {}, body: {} };
      expect(await controller.reset(req as any)).to.eql(output);
      expect(services.stateManagement.reset.args).to.eql([[req]]);
    });
  });

  describe('updateVariables', () => {
    it('works', async () => {
      const output = { foo: 'bar', variables: { a: 1, b: 2 } };
      const services = { session: { getFromDb: sinon.stub().resolves(output), saveToDb: sinon.stub().resolves() } };
      const controller = new StateManagement(services as any, {} as any);

      const body = { b: 3, c: 4 };
      const req = { headers: { projectid: 'project-id', versionid: 'version-id' }, params: { userID: 'user-id' }, body };

      const expectedState = { ...output, variables: { ...output.variables, ...body } };
      expect(await controller.updateVariables(req as any)).to.eql(expectedState);
      expect(services.session.getFromDb.args).to.eql([[req.headers.projectid, req.params.userID]]);
      expect(services.session.saveToDb.args).to.eql([[req.headers.projectid, req.params.userID, expectedState]]);
    });
  });
});
