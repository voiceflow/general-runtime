import { expect } from 'chai';
import sinon from 'sinon';

import CacheDataAPI from '@/lib/services/state/cacheDataAPI';

describe('cacheDataAPI unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getProgram', () => {
    it('works', async () => {
      const versionID = 'version-id';
      const diagramID = 'diagram-id';

      const getProgramStub = sinon.stub().returns('getProgram-value');
      const dataAPIStub = { getProgram: getProgramStub };

      const cacheDataApi = new CacheDataAPI(dataAPIStub as any);

      expect(await cacheDataApi.getProgram(versionID, diagramID)).to.eql('getProgram-value');
      expect(getProgramStub.args).to.eql([[versionID, diagramID]]);
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
});
