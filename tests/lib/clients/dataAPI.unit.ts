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
    };

    expect(DataAPI(config as any, API as any)).to.eql({ type: 'local' });
    expect(API.LocalDataApi.args).to.eql([[{ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path }]]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.RemoteDataAPI.callCount).to.eql(0);
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
    };

    expect(DataAPI(config as any, API as any)).to.eql({ type: 'remote' });
    expect(API.RemoteDataAPI.args).to.eql([
      [{ platform: 'general', adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT }, { axios: Static.axios }],
    ]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('creator api', () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      RemoteDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(DataAPI(config as any, API as any)).to.eql({ type: 'creator' });
    expect(API.CreatorDataApi.args).to.eql([[{ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: config.CREATOR_API_AUTHORIZATION }]]);
    expect(API.RemoteDataAPI.callCount).to.eql(0);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('fails', () => {
    expect(() => DataAPI({} as any, {} as any)).to.throw('no data API env configuration set');
  });
});
