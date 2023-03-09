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
      PrototypeDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      PROJECT_SOURCE: 'cool.vf',
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI({ config, mongo: true } as any, API as any).get()).to.eql({ type: 'local' });
    expect(API.LocalDataApi.args).to.eql([
      [{ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path }],
    ]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.PrototypeDataAPI.callCount).to.eql(1);
  });

  it('prototype data api', async () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      PrototypeDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      ADMIN_SERVER_DATA_API_TOKEN: 'token',
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI({ config, mongo: { db: 'mongodb' } } as any, API as any).get()).to.eql({ type: 'remote' });
    expect(API.PrototypeDataAPI.args).to.eql([[{ client: 'mongodb' }]]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('creator api', async () => {
    const API = {
      LocalDataApi: sinon.stub().returns({ type: 'local' }),
      PrototypeDataAPI: sinon.stub().returns({ type: 'remote' }),
      CreatorDataApi: sinon.stub().returns({ type: 'creator' }),
    };

    const config = {
      VF_DATA_ENDPOINT: 'endpoint',
      CREATOR_API_AUTHORIZATION: 'creator auth',
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    const dataAPI = new DataAPI({ config } as any, API as any);

    expect(await dataAPI.get()).to.eql({ type: 'creator' });
    expect(API.CreatorDataApi.args).to.eql([
      [{ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: config.CREATOR_API_AUTHORIZATION }],
    ]);
    expect(API.LocalDataApi.callCount).to.eql(0);
    expect(API.PrototypeDataAPI.callCount).to.eql(0);

    expect(await dataAPI.get('new auth')).to.eql({ type: 'creator' });
    expect(API.CreatorDataApi.secondCall.args).to.eql([
      { endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: 'new auth' },
    ]);
  });

  it('fails if no data API env configuration set', () => {
    expect(() => new DataAPI({ config: {} } as any)).to.throw('no data API env configuration set');
  });
});
