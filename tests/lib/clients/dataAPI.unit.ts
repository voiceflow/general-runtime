import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import DataAPI from '@/lib/clients/dataAPI';
import Static from '@/lib/clients/static';

describe('dataAPI client unit tests', () => {
  beforeEach(() => {
    sinon.restore();
  });

  it('local api', () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      PROJECT_SOURCE: 'cool.vf',
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
      CREATOR_APP_ENDPOINT: 'voiceflow.com',
    };

    expect(new DataAPI(config as any, API as any).get()).to.eql({ type: 'local' });
    expect(API.LocalDataApi.args).to.eql([[{ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path }]]);
    expect(API.CreatorDataApi.callCount).to.eql(1);
    expect(API.RemoteDataAPI.callCount).to.eql(1);
  });

  it('remote api', () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
      CREATOR_APP_ENDPOINT: 'voiceflow.com',
    };

    const origin = 'voiceflow.com';

    expect(new DataAPI(config as any, API as any).get('', origin)).to.eql({ type: 'remote' });
    expect(API.RemoteDataAPI.args).to.eql([
      [{ platform: 'general', adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT }, { axios: Static.axios }],
    ]);
    expect(API.CreatorDataApi.callCount).to.eql(1);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('creator api', () => {
    const updateAuthorizationStub = sinon.stub();
    const creatorDataAPIReturn = {
      type: 'creator',
      updateAuthorization: updateAuthorizationStub,
    };
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns(creatorDataAPIReturn),
    };

    const config = {
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
      CREATOR_APP_ENDPOINT: 'voiceflow.com',
    };

    const origin = 'other-site.com';

    const dataAPI = new DataAPI(config as any, API as any);

    expect(dataAPI.get('', origin)).to.eql(creatorDataAPIReturn);
    expect(API.CreatorDataApi.args).to.eql([[{ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: config.CREATOR_API_AUTHORIZATION }]]);
    expect(API.RemoteDataAPI.callCount).to.eql(1);
    expect(API.LocalDataApi.callCount).to.eql(0);

    expect(dataAPI.get('new auth', origin)).to.eql(creatorDataAPIReturn);
    expect(updateAuthorizationStub.secondCall.args).to.eql(['new auth']);
  });

  it('fails if no data API env configuration set', () => {
    expect(() => new DataAPI({} as any, {} as any)).to.throw('no data API env configuration set');
  });

  it('fails if origin matches but no remote data API env configuration set', () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
      CREATOR_APP_ENDPOINT: 'voiceflow.com',
    };

    const origin = 'voiceflow.com';

    expect(() => new DataAPI(config as any, API as any).get('', origin)).to.throw('no remote data API env configuration set');
  });

  it('fails if no PROJECT_SOURCE and origin does not match but no creator data API env configuration set', () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_APP_ENDPOINT: 'voiceflow.com',
    };

    const origin = 'other-site.com';

    expect(() => new DataAPI(config as any, API as any).get('', origin)).to.throw('no creator data API env configuration set');
  });
});
