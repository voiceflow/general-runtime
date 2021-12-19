import { expect } from 'chai';
import sinon from 'sinon';

import autoDelegate, { MAX_DELEGATION_TURNS } from '@/lib/services/interact/autoDelegate';

describe('auto delegate unit tests', () => {
  it('works', async () => {
    const context = {
      request: 'initial-request',
    };

    const trace1 = [{ type: 'trace1' }, { type: 'goto', payload: { request: 'goto-request' } }];
    const trace2 = [{ type: 'trace2' }];

    const handler = sinon
      .stub()
      .onFirstCall()
      .resolves({ trace: trace1 })
      .onSecondCall()
      .resolves({ trace: trace2, request: 'finalRequest' });

    expect(await autoDelegate(handler, context as any)).to.eql({ trace: [trace1[0], trace2[0]], request: 'finalRequest' });

    expect(handler.args).to.eql([[context], [{ request: 'goto-request', trace: trace1 }]]);
  });

  it('max calls', async () => {
    const context = {
      request: 'initial-request',
    };

    const genericTrace = { type: 'trace1' };
    const trace = [genericTrace, { type: 'goto', payload: { request: 'goto-request' } }];

    const handler = sinon.stub().resolves({ trace });

    expect(await autoDelegate(handler, context as any)).to.eql({ request: 'goto-request', trace: [genericTrace, genericTrace, genericTrace] });

    expect(handler.callCount).to.eql(MAX_DELEGATION_TURNS);
  });

  it('single iteration', async () => {
    const context = {
      request: 'initial-request',
    };

    const genericTrace = { type: 'trace1' };
    const trace = [genericTrace, genericTrace, genericTrace];

    const handler = sinon.stub().resolves({ trace });

    expect(await autoDelegate(handler, context as any)).to.eql({ trace });

    expect(handler.callCount).to.eql(1);
  });
});
