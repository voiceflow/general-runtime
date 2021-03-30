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
    });
  });

  describe('get', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { session: { getFromDb: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: {}, body: {} };
      expect(await controller.get(req as any)).to.eql(output);
    });
  });

  describe('update', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { session: { saveToDb: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: {}, body: {} };
      expect(await controller.update(req as any)).to.eql(output);
    });
  });

  describe('reset', () => {
    it('works', async () => {
      const output = { foo: 'bar' };
      const services = { stateManagement: { reset: sinon.stub().resolves(output) } };
      const controller = new StateManagement(services as any, {} as any);

      const req = { headers: {}, params: {}, body: {} };
      expect(await controller.reset(req as any)).to.eql(output);
    });
  });
});
