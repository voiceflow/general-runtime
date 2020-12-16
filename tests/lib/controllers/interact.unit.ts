import { expect } from 'chai';
import sinon from 'sinon';

import Interact from '@/lib/controllers/interact';

describe('interact controller unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const output = 'output';

      const services = {
        state: { handle: sinon.stub().resolves(output) },
        asr: { handle: sinon.stub().resolves(output) },
        nlu: { handle: sinon.stub().resolves(output) },
        tts: { handle: sinon.stub().resolves(output) },
        runtime: { handle: sinon.stub().resolves(output) },
        dialog: { handle: sinon.stub().resolves(output) },
        metrics: { prototypeRequest: sinon.stub() },
      };

      const interactController = new Interact(services as any, null as any);

      const req = { body: { state: { foo: 'bar' }, request: 'request' }, params: { versionID: 'versionID' } };
      const context = { state: req.body.state, request: req.body.request, param: req.params.versionID };
      expect(await interactController.handler(req as any)).to.eql(output);
      expect(services.state.handle.args).to.eql([[context]]);
      expect(services.asr.handle.args).to.eql([[context]]);
      expect(services.nlu.handle.args).to.eql([[context]]);
      expect(services.tts.handle.args).to.eql([[context]]);
      expect(services.runtime.handle.args).to.eql([[context]]);
      expect(services.dialog.handle.args).to.eql([[context]]);
      expect(services.metrics.prototypeRequest.callCount).to.eql(1);
    });
  });
});
