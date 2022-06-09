import { BaseRequest } from '@voiceflow/base-types';
import { Locale } from '@voiceflow/voiceflow-types/build/common/constants';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import NLUManager, { utils as defaultUtils } from '@/lib/services/nlu';
import * as NLC from '@/lib/services/nlu/nlc';
import { NONE_INTENT } from '@/lib/services/nlu/utils';

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
        type: BaseRequest.RequestType.TEXT,
        payload: 'query',
      };
      const newRequest = {
        type: BaseRequest.RequestType.INTENT,
        payload: {
          intent: {
            name: 'queryIntent',
          },
          entities: [],
        },
      };
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: newRequest }),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: version._id,
        data: { api: { getVersion: sinon.stub().resolves(version) } },
      };
      expect(await nlu.handle(context as any)).to.eql({ ...context, request: newRequest });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(services.axios.post.args).to.eql([
        [
          `${GENERAL_SERVICE_ENDPOINT}/runtime/${version.projectID}/predict`,
          { query: oldRequest.payload, isProduction: false },
        ],
      ]);
    });

    it('throws on invalid version', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: 'query',
      };
      const services = {
        axios: {
          post: sinon.stub(),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().throws() } },
      };
      await expect(nlu.handle(context as any)).to.eventually.be.rejectedWith();
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(services.axios.post.callCount).to.eql(0);
    });

    it('rejects non text requests', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.INTENT,
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

  describe('predict', () => {
    it('works with model and locale defined and intent is not NONE_INTENT', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: {} }),
        },
      };
      const arg = { model: 'model-val', locale: 'locale-val', query: 'query-val', projectID: 'projectID' } as any;
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);
      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: 'abcdefg' } } } as any);

      expect(await nlu.predict(arg)).to.eql({ payload: { intent: { name: 'abcdefg' } } });
    });

    it('works with model and locale defined and intent is NONE_INTENT, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: 'data-val' }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        model: { key: 'value' } as any,
        locale: Locale.EN_US,
        query: 'query-val',
        projectID: 'projectID',
        isProduction: false,
      };

      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: NONE_INTENT } } } as any);

      expect(await nlu.predict(arg)).to.eql('data-val');
      expect(services.axios.post.args).to.eql([
        [`${GENERAL_SERVICE_ENDPOINT}/runtime/${arg.projectID}/predict`, { query: 'query-val', isProduction: false }],
      ]);
    });

    it('works with model and locale undefined, intent is not NONE_INTENT, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: 'data-val' }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        query: 'query-val',
        projectID: 'projectID',
        isProduction: false,
      };

      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: 'abcdefg' } } } as any);

      expect(await nlu.predict(arg)).to.eql('data-val');
      expect(services.axios.post.args).to.eql([
        [`${GENERAL_SERVICE_ENDPOINT}/runtime/${arg.projectID}/predict`, { query: 'query-val', isProduction: false }],
      ]);
    });

    it('works with model and locale undefined, intent is not NONE_INTENT, prediction empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: undefined }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        query: 'query-val',
        projectID: 'projectID',
        isProduction: true,
      };
      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: 'abcdefg' } } } as any);

      await expect(nlu.predict(arg)).to.be.rejectedWith(Error);
      expect(services.axios.post.args).to.eql([
        [`${GENERAL_SERVICE_ENDPOINT}/runtime/${arg.projectID}/predict`, { query: 'query-val', isProduction: true }],
      ]);
    });

    it('works with model defined and locale undefined, intent is not NONE_INTENT, prediction empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: undefined }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        model: { key: 'value' } as any,
        query: 'query-val',
        projectID: 'projectID',
        isProduction: true,
      };
      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: 'abcdefg' } } } as any);

      await expect(nlu.predict(arg)).to.be.rejectedWith(Error);
      expect(services.axios.post.args).to.eql([
        [`${GENERAL_SERVICE_ENDPOINT}/runtime/${arg.projectID}/predict`, { query: 'query-val', isProduction: true }],
      ]);
    });

    it('works with model and locale defined, intent is NONE_INTENT, prediction is empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: undefined }),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);
      const arg: Parameters<typeof nlu.predict>[0] = {
        model: { key: 'value' } as any,
        locale: Locale.EN_US,
        query: 'query-val',
        projectID: 'projectID',
        isProduction: true,
      };
      const handleNLCCommandStub = sinon
        .stub(NLC, 'handleNLCCommand')
        .returns({ payload: { intent: { name: NONE_INTENT } } } as any);

      expect(await nlu.predict(arg)).to.eql({ payload: { intent: { name: NONE_INTENT } } });
      expect(handleNLCCommandStub.callCount).to.eql(2);
      expect(services.axios.post.args).to.eql([
        [`${GENERAL_SERVICE_ENDPOINT}/runtime/${arg.projectID}/predict`, { query: 'query-val', isProduction: true }],
      ]);
    });
  });
});
