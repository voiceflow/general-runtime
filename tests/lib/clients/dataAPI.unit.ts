import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import DataAPI from '@/lib/clients/dataAPI';
import Static from '@/lib/clients/static';

describe('dataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('local api', async () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      PROJECT_SOURCE: 'cool.vf',
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI(config as any, API as any).get()).to.eql({ type: 'local' });
    expect(API.LocalDataApi.args).to.eql([[{ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path }]]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.RemoteDataAPI.callCount).to.eql(1);
  });

  it('remote api', async () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI(config as any, API as any).get()).to.eql({ type: 'remote' });
    expect(API.RemoteDataAPI.args).to.eql([
      [
        { platform: VoiceflowConstants.PlatformType.GENERAL, adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT },
        { axios: Static.axios },
      ],
    ]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('creator api', async () => {
    const initStub = sinon.stub();
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator', init: initStub }),
    };

    const config = {
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    const dataAPI = new DataAPI(config as any, API as any);

    expect(await dataAPI.get()).to.eql({ type: 'creator', init: initStub });
    expect(API.CreatorDataApi.args).to.eql([[{ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: config.CREATOR_API_AUTHORIZATION }]]);
    expect(initStub.callCount).to.eql(1);
    expect(API.LocalDataApi.callCount).to.eql(0);
    expect(API.RemoteDataAPI.callCount).to.eql(0);

    expect(await dataAPI.get('new auth')).to.eql({ type: 'creator', init: initStub });
    expect(API.CreatorDataApi.secondCall.args).to.eql([{ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: 'new auth' }]);
  });

  it('fails if no data API env configuration set', () => {
    expect(() => new DataAPI({} as any, {} as any)).to.throw('no data API env configuration set');
  });

  describe('init', () => {
    it('calls only remote api init', async () => {
      const localInitStub = sinon.stub().resolves();
      const remoteInitStub = sinon.stub().resolves();
      const creatorInitStub = sinon.stub().resolves();

      const API = {
        LocalDataApi: sinon.stub().returns({ init: localInitStub }),
        RemoteDataAPI: sinon.stub().returns({ init: remoteInitStub }),
        CreatorDataApi: sinon.stub().returns({ init: creatorInitStub }),
      };

      const config = {
        ADMIN_SERVER_DATA_API_TOKEN: 'token',
        VF_DATA_ENDPOINT: 'endpoint',
        CREATOR_API_ENDPOINT: 'creator endpoint',
      };

      await new DataAPI(config as any, API as any).init();

      expect(localInitStub.callCount).to.eql(0);
      expect(remoteInitStub.callCount).to.eql(1);
      expect(creatorInitStub.callCount).to.eql(0);
    });

    it('calls local and remote api init', async () => {
      const localInitStub = sinon.stub().resolves();
      const remoteInitStub = sinon.stub().resolves();
      const creatorInitStub = sinon.stub().resolves();

      const API = {
        LocalDataApi: sinon.stub().returns({ init: localInitStub }),
        RemoteDataAPI: sinon.stub().returns({ init: remoteInitStub }),
        CreatorDataApi: sinon.stub().returns({ init: creatorInitStub }),
      };

      const config = {
        PROJECT_SOURCE: 'cool.vf',
        ADMIN_SERVER_DATA_API_TOKEN: 'token',
        VF_DATA_ENDPOINT: 'endpoint',
        CREATOR_API_ENDPOINT: 'creator endpoint',
      };

      await new DataAPI(config as any, API as any).init();

      expect(localInitStub.callCount).to.eql(1);
      expect(remoteInitStub.callCount).to.eql(1);
      expect(creatorInitStub.callCount).to.eql(0);
    });
  });
});
