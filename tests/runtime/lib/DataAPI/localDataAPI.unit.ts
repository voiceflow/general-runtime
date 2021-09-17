import { expect } from 'chai';
import sinon from 'sinon';

import LocalDataAPI from '@/runtime/lib/DataAPI/localDataAPI';

describe('localDataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('constructor with projectsource', () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: 'programs-val',
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI({ projectSource: 'projectSource-val' }, { fs: stubFS as any, path: path as any });
    LocalDataApi.init();

    expect(jsonParseStub.args).to.eql([['readFileSync-val']]);
    expect(stubFS.readFileSync.args).to.eql([['join-val', 'utf8']]);
    expect(path.join.args).to.eql([['projects', 'projectSource-val']]);
  });

  it('constructor without projectsource', () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: 'programs-val',
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    expect(() => {
      const api = new LocalDataAPI({ projectSource: '' }, { fs: stubFS as any, path: path as any });
    }).to.throw();
  });

  it('getVersion', async () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: 'programs-val',
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI({ projectSource: 'projectSource-val' }, { fs: stubFS as any, path: path as any });

    expect(await LocalDataApi.getVersion()).to.eql(content.version);
  });

  it('getProgram', async () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: {
        a: 'b',
      },
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI({ projectSource: 'projectSource-val' }, { fs: stubFS as any, path: path as any });

    expect(await LocalDataApi.getProgram('a')).to.eql('b');
  });

  it('getProject', async () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: 'programs-val',
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI({ projectSource: 'projectSource-val' }, { fs: stubFS as any, path: path as any });

    expect(await LocalDataApi.getProject()).to.eql(content.project);
  });

  it('fetchDisplayById', async () => {
    const content = {
      version: 'version-val',
      project: 'project-val',
      programs: 'programs-val',
    };
    const stubFS = {
      readFileSync: sinon.stub().returns('readFileSync-val'),
    };
    const jsonParseStub = sinon.stub(JSON, 'parse').returns(content as any);
    const path = {
      join: sinon.stub().returns('join-val'),
    };

    const LocalDataApi = new LocalDataAPI({ projectSource: 'projectSource-val' }, { fs: stubFS as any, path: path as any });

    expect(await LocalDataApi.fetchDisplayById()).to.eql(null);
  });
});
