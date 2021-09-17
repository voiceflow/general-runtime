import { expect } from 'chai';
import sinon from 'sinon';

import CacheDataAPI from '@/lib/services/state/cacheDataAPI';

describe('cacheDataAPI unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getProgram', () => {
    it('works', async () => {
      const getProgramStub = sinon.stub().returns('getProgram-value');
      const dataAPIStub = { getProgram: getProgramStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getProgram('program-id')).to.eql('getProgram-value');
      expect(getProgramStub.args).to.eql([['program-id']]);
    });
  });

  describe('getVersion', () => {
    it('fetches on first viewing', async () => {
      const getVersionStub = sinon.stub().returns('getVersion-value');
      const dataAPIStub = { getVersion: getVersionStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getVersion('version-id')).to.eql('getVersion-value');
      expect(getVersionStub.args).to.eql([['version-id']]);
    });

    it('caches on second viewing', async () => {
      const getVersionStub = sinon.stub().returns('getVersion-value');
      const dataAPIStub = { getVersion: getVersionStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getVersion('version-id')).to.eql('getVersion-value');
      expect(await cacheDataApi.getVersion('version-id')).to.eql('getVersion-value');
      expect(getVersionStub.args).to.eql([['version-id']]);
    });
  });

  describe('getProject', () => {
    it('fetches on first viewing', async () => {
      const getProjectStub = sinon.stub().returns('getProject-value');
      const dataAPIStub = { getProject: getProjectStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getProject('project-id')).to.eql('getProject-value');
      expect(getProjectStub.args).to.eql([['project-id']]);
    });

    it('caches on second viewing', async () => {
      const getProjectStub = sinon.stub().returns('getProject-value');
      const dataAPIStub = { getProject: getProjectStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getProject('project-id')).to.eql('getProject-value');
      expect(await cacheDataApi.getProject('project-id')).to.eql('getProject-value');
      expect(getProjectStub.args).to.eql([['project-id']]);
    });
  });

  describe('init', () => {
    it('works', async () => {
      const initStub = sinon.stub().returns('init-value');
      const dataAPIStub = { init: initStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      await cacheDataApi.init();

      expect(initStub.args).to.eql([[]]);
    });
  });

  describe('unhashVersionID', () => {
    it('works', async () => {
      const unhashVersionIDStub = sinon.stub().returns('unhashVersionID-value');
      const dataAPIStub = { unhashVersionID: unhashVersionIDStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.unhashVersionID('999')).to.eql('unhashVersionID-value');
      expect(dataAPIStub.unhashVersionID.args).to.eql([['999']]);
    });
  });

  describe('fetchDisplayById', () => {
    it('works', async () => {
      const fetchDisplayByIdStub = sinon.stub().returns('fetchDisplayById-value');
      const dataAPIStub = { fetchDisplayById: fetchDisplayByIdStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.fetchDisplayById(999)).to.eql('fetchDisplayById-value');
      expect(fetchDisplayByIdStub.args).to.eql([[999]]);
    });
  });
});
