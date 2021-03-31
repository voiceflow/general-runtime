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

      const req = { headers: {}, params: { userID: 'user-id', versionID: 'version-id' }, body: {} };
      expect(await controller.get(req as any)).to.eql(output);
      expect(services.session.getFromDb.args).to.eql([[req.params.versionID, req.params.userID]]);
    });
  });

  describe('update', () => {
    it('works', async () => {
      const services = { session: { saveToDb: sinon.stub().resolves() } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: { userID: 'user-id', versionID: 'version-id' }, body: { state: { foo: 'bar' } } };
      expect(await controller.update(req as any)).to.eql(req.body.state);
      expect(services.session.saveToDb.args).to.eql([[req.params.versionID, req.params.userID, req.body.state]]);
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
});
