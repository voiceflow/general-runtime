/* eslint-disable no-new */
import { expect } from 'chai';
import sinon from 'sinon';

import LocalDataAPI from '@/runtime/lib/DataAPI/localDataAPI';

const getVFR = () => ({
  version: { _id: 'version-id' },
  project: 'project-val',
  // 'version-id' is the base program
  programs: { a: 'b', c: 'd', 'version-id': 'e' },
});

describe('localDataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('constructor with projectsource', () => {
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(getVFR() as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    new LocalDataAPI(
      { projectSource: 'projectSource-val' },
      { fs: stubFS as any, path: path as any }
    );

    expect(jsonParseStub.args).to.eql([['readFileSync-val']]);
    expect(stubFS.readFileSync.args).to.eql([['join-val', 'utf8']]);
    expect(path.join.args).to.eql([['projects', 'projectSource-val']]);
  });

  it('constructor without projectsource', () => {
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    expect(() => {
      new LocalDataAPI({ projectSource: '' }, { fs: stubFS as any, path: path as any });
    }).to.throw();
  });

  it('constructor with empty VFR', () => {
    const stubFS = { readFileSync: sinon.stub().returns(JSON.stringify({})) };

    const path = { join: sinon.stub().returns('join-val') };

    expect(() => {
      new LocalDataAPI(
        { projectSource: 'projectSource-val' },
        { fs: stubFS as any, path: path as any }
      );
    }).to.throw('[invalid VFR] no programs included');
  });

  it('constructor with empty programs', () => {
    const stubFS = { readFileSync: sinon.stub().returns(JSON.stringify({ programs: {} })) };

    const path = { join: sinon.stub().returns('join-val') };

    expect(() => {
      new LocalDataAPI(
        { projectSource: 'projectSource-val' },
        { fs: stubFS as any, path: path as any }
      );
    }).to.throw('[invalid VFR] no programs included');
  });

  it('constructor missing base program', () => {
    const stubFS = {
      readFileSync: sinon
        .stub()
        .returns(JSON.stringify({ version: { _id: '1' }, programs: { foo: 'bar' } })),
    };

    const path = { join: sinon.stub().returns('join-val') };

    expect(() => {
      new LocalDataAPI(
        { projectSource: 'projectSource-val' },
        { fs: stubFS as any, path: path as any }
      );
    }).to.throw('[invalid VFR] missing base program');
  });

  it('getVersion', async () => {
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    sinon.stub(JSON, 'parse').returns(getVFR() as any);

    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI(
      { projectSource: 'projectSource-val' },
      { fs: stubFS as any, path: path as any }
    );

    expect(await LocalDataApi.getVersion()).to.eql(getVFR().version);
  });

  it('getProgram', async () => {
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    sinon.stub(JSON, 'parse').returns(getVFR() as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI(
      { projectSource: 'projectSource-val' },
      { fs: stubFS as any, path: path as any }
    );

    expect(await LocalDataApi.getProgram('a', 'a')).to.eql('b');
  });

  it('getProject', async () => {
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    sinon.stub(JSON, 'parse').returns(getVFR() as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI(
      { projectSource: 'projectSource-val' },
      { fs: stubFS as any, path: path as any }
    );

    expect(await LocalDataApi.getProject()).to.eql(getVFR().project);
  });
});
