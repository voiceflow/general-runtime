import { RequestType } from '@voiceflow/general-types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import NLUManager, { utils as defaultUtils } from '@/lib/services/nlu';

chai.use(chaiAsPromised);
const { expect } = chai;

const GENERAL_SERVICE_ENDPOINT = 'http://localhost:6970';
const config = {
  GENERAL_SERVICE_ENDPOINT,
};

describe('nlu manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('works', async () => {
      const version = { _id: 'version-id', projectID: 'project-id' };
      const oldRequest = {
        type: RequestType.TEXT,
        payload: 'query',
      };
      const newRequest = {
        type: RequestType.INTENT,
        payload: {
          intent: {
            name: 'queryIntent',
          },
          entities: [],
        },
      };
      const services = {
        dataAPI: {
          getVersion: sinon.stub().resolves(version),
        },
        axios: {
          post: sinon.stub().resolves({ data: newRequest }),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = { request: oldRequest, state: { foo: 'bar' }, versionID: version._id };
      expect(await nlu.handle(context as any)).to.eql({ ...context, request: newRequest });
      expect(services.dataAPI.getVersion.args).to.eql([[context.versionID]]);
      expect(services.axios.post.args).to.eql([[`${GENERAL_SERVICE_ENDPOINT}/runtime/${version.projectID}/predict`, { query: oldRequest.payload }]]);
    });

    it('throws on invalid version', async () => {
      const oldRequest = {
        type: RequestType.TEXT,
        payload: 'query',
      };
      const services = {
        dataAPI: {
          getVersion: sinon.stub().throws(),
        },
        axios: {
          post: sinon.stub(),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = { request: oldRequest, state: { foo: 'bar' }, versionID: 'version-id' };
      await expect(nlu.handle(context as any)).to.eventually.be.rejectedWith();
      expect(services.dataAPI.getVersion.args).to.eql([[context.versionID]]);
      expect(services.axios.post.callCount).to.eql(0);
    });

    it('rejects non text requests', async () => {
      const oldRequest = {
        type: RequestType.INTENT,
        payload: 'query',
      };
      const services = {
        dataAPI: {
          getVersion: sinon.stub(),
        },
        axios: {
          post: sinon.stub(),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = { request: oldRequest, state: { foo: 'bar' }, versionID: 'version-id' };
      expect(await nlu.handle(context as any)).to.eql(context);
      expect(services.dataAPI.getVersion.callCount).to.eql(0);
      expect(services.axios.post.callCount).to.eql(0);
    });
  });
});
