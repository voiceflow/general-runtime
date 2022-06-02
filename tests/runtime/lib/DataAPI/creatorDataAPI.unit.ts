import { expect } from 'chai';
import sinon from 'sinon';

import CreatorDataAPI from '@/runtime/lib/DataAPI/creatorDataAPI';

describe('creatorDataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('new', () => {
    it('works correctly', async () => {
      const VFClient = sinon.stub();
      const VF = sinon.stub().returns({
        generateClient: VFClient,
      });

      const config = {
        endpoint: '_endpoint',
        authorization: '_authorization',
        clientKey: '_clientKey',
        prototype: true,
      };

      const creatorDataAPI = new CreatorDataAPI(config, VF as any);
      await creatorDataAPI.init();

      expect(VF.args).to.eql([[{ apiEndpoint: config.endpoint, clientKey: config.clientKey }]]);
      expect(VFClient.args).to.eql([[{ authorization: config.authorization }]]);
    });

    it('works correctly with default clientKey arg', async () => {
      const VFClient = sinon.stub();
      const VF = sinon.stub().returns({
        generateClient: VFClient,
      });

      const config = { endpoint: '_endpoint', authorization: '_authorization', prototype: true };

      const creatorDataAPI = new CreatorDataAPI(config, VF as any);
      await creatorDataAPI.init();

      expect(VF.args).to.eql([[{ apiEndpoint: config.endpoint, clientKey: '' }]]);
      expect(VFClient.args).to.eql([[{ authorization: config.authorization }]]);
    });
  });

  describe('fetchDisplayById', () => {
    it('no data', async () => {
      const VFClient = sinon.stub();
      const VF = sinon.stub().returns({
        generateClient: VFClient,
      });

      const config = {
        endpoint: '_endpoint',
        authorization: '_authorization',
        clientKey: '_clientKey',
        prototype: true,
      };
      const creatorDataAPI = new CreatorDataAPI(config, VF as any);

      expect(await creatorDataAPI.fetchDisplayById()).to.eql(null);
    });
  });

  describe('getProgram', () => {
    it('prototype', async () => {
      const programID = 'programID';
      const program = 'program';
      const Client = {
        program: { get: sinon.stub().resolves(program) },
        prototypeProgram: { get: sinon.stub().resolves(program) },
      };
      const VFClient = sinon.stub().returns(Client);
      const VF = sinon.stub().returns({
        generateClient: VFClient,
      });

      const config = { endpoint: '_endpoint', authorization: '_authorization', clientKey: '_clientKey' };
      const creatorDataAPI = new CreatorDataAPI(config, VF as any);

      expect(await creatorDataAPI.getProgram(programID)).to.eql(program);
      expect(Client.prototypeProgram.get.args).to.eql([[programID]]);
      expect(Client.program.get.callCount).to.eql(0);
    });

    it('no prototype', async () => {
      const programID = 'programID';
      const program = 'program';
      const Client = {
        program: { get: sinon.stub().resolves(program) },
        prototypeProgram: { get: sinon.stub().resolves(program) },
      };
      const VFClient = sinon.stub().returns(Client);
      const VF = sinon.stub().returns({
        generateClient: VFClient,
      });

      const config = {
        endpoint: '_endpoint',
        authorization: '_authorization',
        clientKey: '_clientKey',
        prototype: false,
      };
      const creatorDataAPI = new CreatorDataAPI(config, VF as any);

      expect(await creatorDataAPI.getProgram(programID)).to.eql(program);
      expect(Client.program.get.args).to.eql([[programID]]);
      expect(Client.prototypeProgram.get.callCount).to.eql(0);
    });
  });

  it('getVersion', async () => {
    const versionID = 'versionID';
    const version = 'version';
    const Client = { version: { get: sinon.stub().resolves(version) } };
    const VFClient = sinon.stub().returns(Client);
    const VF = sinon.stub().returns({
      generateClient: VFClient,
    });

    const config = { endpoint: '_endpoint', authorization: '_authorization', clientKey: '_clientKey' };
    const creatorDataAPI = new CreatorDataAPI(config, VF as any);

    expect(await creatorDataAPI.getVersion(versionID)).to.eql(version);
    expect(Client.version.get.args).to.eql([[versionID]]);
  });

  it('unhashVersionID', async () => {
    const Client = { version: { get: sinon.stub().resolves() } };
    const VFClient = sinon.stub().returns(Client);
    const VF = sinon.stub().returns({
      generateClient: VFClient,
    });
    const versionID = 'versionID';
    const creatorDataAPI = new CreatorDataAPI({} as any, VF as any);

    expect(await creatorDataAPI.unhashVersionID(versionID)).to.eql(versionID);
  });

  it('getProject', async () => {
    const projectID = 'projectID';
    const project = 'project';
    const Client = { project: { get: sinon.stub().resolves(project) } };
    const VFClient = sinon.stub().returns(Client);
    const VF = sinon.stub().returns({
      generateClient: VFClient,
    });

    const config = { endpoint: '_endpoint', authorization: '_authorization', clientKey: '_clientKey' };
    const creatorDataAPI = new CreatorDataAPI(config, VF as any);

    expect(await creatorDataAPI.getProject(projectID)).to.eql(project);
    expect(Client.project.get.args).to.eql([[projectID]]);
  });
});
