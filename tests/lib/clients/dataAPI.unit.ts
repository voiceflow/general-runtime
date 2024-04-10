import { expect } from 'chai';
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
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI({ config, mongo: true } as any, API as any).get()).to.eql({
      type: 'local',
    });
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
      CREATOR_API_ENDPOINT: 'creator endpoint',
    };

    expect(await new DataAPI({ config, mongo: { db: 'mongodb' } } as any, API as any).get()).to.eql(
      { type: 'remote' }
    );
    expect(API.PrototypeDataAPI.args).to.eql([[{ db: 'mongodb' }]]);
    expect(API.CreatorDataApi.callCount).to.eql(0);
    expect(API.LocalDataApi.callCount).to.eql(0);
  });

  it('fails if no data API env configuration set', () => {
    expect(() => new DataAPI({ config: {} } as any)).to.throw('no data API env configuration set');
  });
});
