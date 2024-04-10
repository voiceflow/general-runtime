import { expect } from 'chai';
import sinon from 'sinon';

import StateManager, { utils } from '@/lib/services/state';

const VERSION_ID = 'version_id';
const PROJECT_ID = 'project_id';
const defaultTimestamp = 1234567890;
const userID = 'user_id';

const version = {
  _id: VERSION_ID,
  prototype: {
    data: {
      locales: ['en-US'],
    },
    model: {
      slots: [{ name: 'slot1' }],
    },
    context: {
      variables: { variable1: 1, variable2: 2 },
    },
    surveyorContext: {},
  },
  projectID: 'projectID',
  variables: ['variable1'],
  rootDiagramID: 'a',
};

const project = { id: PROJECT_ID };

const plan = undefined;

const state = {
  stack: [
    {
      diagramID: version.rootDiagramID,
      storage: {},
      variables: {},
    },
  ],
  variables: {
    slot1: 0,
    variable1: 1,
    variable2: 2,
    sessions: 1,
    timestamp: defaultTimestamp,
    user_id: userID,
  },
  storage: {},
};

const defaultUtils = { ...utils, getTime: sinon.stub().returns(defaultTimestamp) };

describe('state manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('generate', () => {
    it('works', async () => {
      const getVersionStub = sinon.stub().resolves(version);
      const services = {
        dataAPI: {
          get: sinon.stub().returns({ getVersion: getVersionStub }),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      expect(await stateManager.generate(version as any)).to.eql({
        ...state,
        variables: { sessions: 1, variable1: 1, variable2: 2 },
      });
      expect(services.dataAPI.get.callCount).to.eql(0);
      expect(getVersionStub.callCount).to.eql(0);
    });
  });

  describe('initializeVariables', () => {
    it('works', async () => {
      const services = {
        dataAPI: {
          getVersion: sinon.stub(),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      expect(await stateManager.initializeVariables(version as any, {} as any)).to.eql({
        variables: { variable1: 0, slot1: 0, timestamp: defaultTimestamp },
      });
      expect(services.dataAPI.getVersion.callCount).to.eql(0);
    });
  });

  describe('handle', () => {
    it('works', async () => {
      const getVersionStub = sinon.stub().resolves(version);
      const getProjectStub = sinon.stub().resolves(project);
      const services = {
        dataAPI: {
          get: sinon.stub().returns({ getVersion: getVersionStub, getProject: getProjectStub }),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      const context = {
        versionID: VERSION_ID,
        projectID: version.projectID,
        data: { foo: 'bar' },
        userID,
      } as any;

      const newContext = await stateManager.handle(context);

      expect(newContext).to.eql({
        request: null,
        versionID: VERSION_ID,
        projectID: version.projectID,
        state,
        userID,
        version,
        plan,
        project,
        trace: [],
        data: {
          ...context.data,
          locale: version.prototype.data.locales[0],
          api: newContext.data.api,
        },
      });
      expect(await newContext.data.api.getVersion(VERSION_ID)).to.eql(version);
      expect(getVersionStub.args).to.eql([[VERSION_ID]]);
    });

    it('throw errors on no versionID', async () => {
      const getVersionStub = sinon.stub().resolves(version);
      const services = {
        dataAPI: {
          get: sinon.stub().returns({ getVersion: getVersionStub }),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      const context = {
        data: { foo: 'bar' },
      } as any;

      await expect(stateManager.handle(context)).to.be.rejectedWith(Error);
    });

    it('works if stack does not exist', async () => {
      const getVersionStub = sinon.stub().resolves(version);
      const getProjectStub = sinon.stub().resolves(project);
      const services = {
        dataAPI: {
          get: sinon.stub().returns({ getVersion: getVersionStub, getProject: getProjectStub }),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      const context = {
        state: {},
        versionID: VERSION_ID,
        projectID: version.projectID,
        data: { foo: 'bar' },
        userID,
      } as any;

      const newContext = await stateManager.handle(context);

      expect(newContext).to.eql({
        versionID: VERSION_ID,
        projectID: version.projectID,
        userID,
        request: null,
        version,
        project,
        plan,
        state,
        trace: [],
        data: {
          ...context.data,
          locale: version.prototype.data.locales[0],
          api: newContext.data.api,
        },
      });
      expect(await newContext.data.api.getVersion(VERSION_ID)).to.eql(version);
      expect(getVersionStub.args).to.eql([[VERSION_ID]]);
    });

    it('works if stack is empty', async () => {
      const getVersionStub = sinon.stub().resolves(version);
      const getProjectStub = sinon.stub().resolves(project);
      const services = {
        dataAPI: {
          get: sinon.stub().returns({ getVersion: getVersionStub, getProject: getProjectStub }),
        },
      };

      const stateManager = new StateManager(
        { ...services, utils: { ...defaultUtils } } as any,
        {} as any
      );

      const context = {
        state: { stack: [] },
        versionID: VERSION_ID,
        projectID: version.projectID,
        data: { foo: 'bar' },
        userID,
      } as any;

      const newContext = await stateManager.handle(context);

      expect(newContext).to.eql({
        request: null,
        versionID: VERSION_ID,
        projectID: version.projectID,
        state,
        trace: [],
        version,
        project,
        plan,
        userID,
        data: {
          ...context.data,
          locale: version.prototype.data.locales[0],
          api: newContext.data.api,
        },
      });
      expect(await newContext.data.api.getVersion(VERSION_ID)).to.eql(version);
      expect(getVersionStub.args).to.eql([[VERSION_ID]]);
    });
  });
});
