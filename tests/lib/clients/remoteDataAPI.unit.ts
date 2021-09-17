import { PlatformType } from '@voiceflow/internal';
import { expect } from 'chai';
import sinon from 'sinon';

import RemoteDataAPI from '@/lib/clients/remoteDataAPI';

describe('remoteDataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('getProgram', async () => {
    const mockGetReturnValue = 'get-program-mock-return-value';
    const axiosClientGetMock = sinon.stub().returns({ data: mockGetReturnValue });
    const axios = {
      create: sinon.stub().returns({ get: axiosClientGetMock }),
      post: sinon.stub().returns({ data: { token: 'secret-token' } }),
    };
    const testConfig = { platform: PlatformType.ALEXA, dataEndpoint: 'data-endpoint', adminToken: 'admin-token' };
    const arg = 'mock-program-id';

    const client = new RemoteDataAPI(testConfig, { axios } as any);
    await client.init();

    expect(await client.getProgram(arg)).to.eql(mockGetReturnValue);
    expect(axiosClientGetMock.args).to.eql([[`/prototype-programs/${arg}`]]);
  });
});
