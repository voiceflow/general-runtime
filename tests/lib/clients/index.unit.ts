import { expect } from 'chai';
import sinon from 'sinon';

import { initClients, stopClients } from '@/lib/clients';

describe('clients/index', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('initClients with mongo defined', async () => {
    const clients = { mongo: { start: sinon.stub().resolves() } };

    await initClients(clients as any);

    expect(clients.mongo.start.callCount).to.eql(1);
  });

  it('stopClients with mongo defined', async () => {
    const clients = { mongo: { stop: sinon.stub().resolves() } };

    await stopClients({} as any, clients as any);

    expect(clients.mongo.stop.callCount).to.eql(1);
  });

  it('stopClients with no mongo defined', async () => {
    const clients = {};

    // should go through stop without issue
    await expect(stopClients({} as any, clients as any)).not.to.rejectedWith(Error);
  });
});
