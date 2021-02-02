import { expect } from 'chai';
import sinon from 'sinon';

import Interact from '@/lib/controllers/interact';

describe('interact controller unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const req = {
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: true } },
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = { state: req.body.state, request: req.body.request, versionID: req.params.versionID, data: { locale: req.query.locale } };
      const output = (data: string) => ({ ...context, data, end: false });

      const services = {
        state: { handle: sinon.stub().resolves(output('state')) },
        asr: { handle: sinon.stub().resolves(output('asr')) },
        nlu: { handle: sinon.stub().resolves(output('nlu')) },
        tts: { handle: sinon.stub().resolves(output('tts')) },
        chips: { handle: sinon.stub().resolves(output('chips')) },
        runtime: { handle: sinon.stub().resolves(output('runtime')) },
        dialog: { handle: sinon.stub().resolves(output('dialog')) },
        metrics: { generalRequest: sinon.stub() },
      };

      const interactController = new Interact(services as any, null as any);

      expect(await interactController.handler(req as any)).to.eql(output('chips'));

      expect(services.state.handle.args).to.eql([[context]]);
      expect(services.asr.handle.args).to.eql([[output('state')]]);
      expect(services.nlu.handle.args).to.eql([[output('asr')]]);
      expect(services.dialog.handle.args).to.eql([[output('nlu')]]);
      expect(services.runtime.handle.args).to.eql([[output('dialog')]]);
      expect(services.tts.handle.args).to.eql([[output('runtime')]]);
      expect(services.chips.handle.args).to.eql([[output('tts')]]);
      expect(services.metrics.generalRequest.callCount).to.eql(1);
    });
  });
});
