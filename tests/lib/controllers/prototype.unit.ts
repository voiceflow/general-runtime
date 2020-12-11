import { expect } from 'chai';
import sinon from 'sinon';

import Prototype from '@/lib/controllers/interact';

describe('prototype controller unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const output = 'output';

      const services = {
        prototype: { invoke: sinon.stub().resolves(output) },
        metrics: { prototypeRequest: sinon.stub() },
      };

      const testController = new Prototype(services as any, null as any);

      const req = { body: { state: { foo: 'bar' }, request: 'request' } };
      expect(await testController.handler(req as any)).to.eql(output);
      expect(services.prototype.invoke.args).to.eql([[req.body.state, req.body.request]]);
      expect(services.metrics.prototypeRequest.callCount).to.eql(1);
    });
  });
});
