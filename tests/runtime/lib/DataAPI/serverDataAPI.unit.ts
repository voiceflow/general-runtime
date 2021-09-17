import { PlatformType } from '@voiceflow/internal';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import ServerDataAPI from '@/runtime/lib/DataAPI/serverDataAPI';

const getServerDataApi = async (axiosInstance: Record<string, (...args: any[]) => any>) => {
  const axios = { create: sinon.stub().returns(axiosInstance), post: sinon.stub().returns({ data: { token: 'secret-token' } }) };
  const testConfig = { platform: PlatformType.ALEXA, dataEndpoint: 'data-endpoint', adminToken: 'admin-token' };

  const client = new ServerDataAPI(testConfig, { axios } as any);
  await client.init();

  return client;
};

describe('serverDataAPI client unit tests', () => {
  describe('new', () => {
    it('works correctly', async () => {
      const platform = PlatformType.ALEXA;
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
            platform: PlatformType.ALEXA,
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

  describe('unhashVersionID', () => {
    describe('24 length', () => {
      it('valid object id', async () => {
        const versionID = '5ede8aec9edf9c1b7c1c4166';
        const client = await getServerDataApi(null as any);

        expect(await client.unhashVersionID(versionID)).to.eql(versionID);
      });

      it('not valid object id', async () => {
        const versionID = 'XXXXXXXXXXXXXXXXXXXXXXXX'; // 24 length
        const client = await getServerDataApi(null as any);
        const unhashedVersionID = 'unhashed';
        const _convertSkillIDStub = sinon.stub().resolves(unhashedVersionID);
        _.set(client, '_convertSkillID', _convertSkillIDStub);

        expect(await client.unhashVersionID(versionID)).to.eql(unhashedVersionID);
        expect(_convertSkillIDStub.args).to.eql([[versionID]]);
      });
    });

    it('unhashes correctly', async () => {
      const versionID = 'abc';
      const client = await getServerDataApi(null as any);
      const unhashedVersionID = 'unhashed';
      const _convertSkillIDStub = sinon.stub().resolves(unhashedVersionID);
      _.set(client, '_convertSkillID', _convertSkillIDStub);

      expect(await client.unhashVersionID(versionID)).to.eql(unhashedVersionID);
      expect(_convertSkillIDStub.args).to.eql([[versionID]]);
    });
  });

  describe('_convertSkillID', () => {
    it('works', async () => {
      const unhashedVersionID = 'unhashed';
      const axios = { get: sinon.stub().returns({ data: unhashedVersionID }) };
      const versionID = 'abc';

      const client = await getServerDataApi(axios);

      expect(await _.get(client, '_convertSkillID')(versionID)).to.eql(unhashedVersionID);
      expect(await _.get(client, '_convertSkillID')(versionID)).to.eql(unhashedVersionID);
      expect(axios.get.callCount).to.eql(1); // axios called only once as call is memoized
      expect(axios.get.args).to.eql([[`/version/convert/${versionID}`]]);
    });
  });

  it('getProject', async () => {
    const data = { foo: 'bar' };
    const axios = { get: sinon.stub().returns({ data }) };
    const client = await getServerDataApi(axios);

    const projectId = '1';
    expect(await client.getProject(projectId)).to.eql(data);
    expect(axios.get.args).to.eql([[`/project/${projectId}`]]);
  });
});
