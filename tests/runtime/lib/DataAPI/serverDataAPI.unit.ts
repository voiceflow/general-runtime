import { expect } from 'chai';
import sinon from 'sinon';

import ServerDataAPI from '@/runtime/lib/DataAPI/serverDataAPI';

const getServerDataApi = async (axiosInstance: Record<string, (...args: any[]) => any>) => {
  const axios = { create: sinon.stub().returns(axiosInstance), post: sinon.stub().returns({ data: { token: 'secret-token' } }) };
  const testConfig = { platform: 'alexa', dataEndpoint: 'data-endpoint', adminToken: 'admin-token' };

  const client = new ServerDataAPI(testConfig, { axios } as any);
  await client.init();

  return client;
};

describe('serverDataAPI client unit tests', () => {
  describe('new', () => {
    it('works correctly', async () => {
      const platform = 'alexa';
      const dataSecret = 'secret-token';
      const adminToken = 'admin-token';
      const dataEndpoint = 'random';

      const axios = { post: sinon.stub().returns({ data: { token: dataSecret } }), create: sinon.stub() };
      const testConfig = {
        platform,
        adminToken,
        dataEndpoint,
      };

      const serverDataAPI = new ServerDataAPI(testConfig, { axios } as any);
      await serverDataAPI.init();

      expect(axios.post.args).to.eql([
        [
          `${dataEndpoint}/generate-platform-token`,
          {
            platform: 'alexa',
            ttl_min: 525600,
          },
          { headers: { admintoken: adminToken } },
        ],
      ]);
      expect(axios.create.args).to.eql([
        [
          {
            baseURL: testConfig.dataEndpoint,
            headers: { authorization: `Bearer ${dataSecret}` },
          },
        ],
      ]);
    });
  });

  describe('fetchDisplayById', () => {
    it('no data', async () => {
      const axios = { get: sinon.stub().returns({}) };
      const client = await getServerDataApi(axios);

      const displayId = 1;
      expect(await client.fetchDisplayById(displayId)).to.eql(null);
      expect(axios.get.args).to.eql([[`/metadata/displays/${displayId}`]]);
    });

    it('with data', async () => {
      const data = { foo: 'bar' };
      const axios = { get: sinon.stub().returns({ data }) };
      const client = await getServerDataApi(axios);

      const displayId = 1;
      expect(await client.fetchDisplayById(displayId)).to.eql(data);
    });
  });

  it('getProgram', async () => {
    const data = { foo: 'bar' };
    const axios = { get: sinon.stub().returns({ data }) };
    const client = await getServerDataApi(axios);

    const programId = '1';
    expect(await client.getProgram(programId)).to.eql(data);
    expect(axios.get.args).to.eql([[`/diagrams/${programId}`]]);
  });

  it('getVersion', async () => {
    const data = { foo: 'bar' };
    const axios = { get: sinon.stub().returns({ data }) };
    const client = await getServerDataApi(axios);

    const versionId = '1';
    expect(await client.getVersion(versionId)).to.eql(data);
    expect(axios.get.args).to.eql([[`/version/${versionId}`]]);
  });
});
