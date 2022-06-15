import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import { IntentRequest, RequestType } from '@voiceflow/base-types/build/common/request';
import { Locale } from '@voiceflow/voiceflow-types/build/common/constants';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import NLUManager, { utils as defaultUtils } from '@/lib/services/nlu';
import * as NLC from '@/lib/services/nlu/nlc';
import { NONE_INTENT } from '@/lib/services/nlu/utils';
import { VersionTag } from '@/types';

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

  const model = {
    slots: [],
    intents: [],
  };
  const tag = VersionTag.PRODUCTION;
  const locale = Locale.DE_DE;
  const query = 'I would like a large sofa pizza with extra chair';
  const nlp = {
    type: BaseModels.ProjectNLP.LUIS,
    appID: 'nlp-app-id',
    resourceID: 'nlp-resource-id',
  };

  const version = {
    _id: 'version-id',
    projectID: 'project-id',
  };
  const project = {
    _id: 'project-id',
    prototype: {
      nlp: {
        appID: 'nlp-app-id',
        resourceID: 'nlp-resource-id',
      },
    },
  };

  const liveVersion = 'some-live-version';

  const nlcMatchedIntent: IntentRequest = {
    type: RequestType.INTENT,
    payload: {
      intent: {
        name: 'abcedfg',
      },
      query,
      entities: [],
      confidence: 0.56,
    },
  };

  const noneIntent: IntentRequest = {
    type: RequestType.INTENT,
    payload: {
      intent: {
        name: NONE_INTENT,
      },
      query,
      entities: [],
    },
  };
  const luisResponse = {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      intent: {
        name: 'Order Pizza',
      },
      entities: [],
    },
  };

  describe('handle', () => {
    it('works', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: 'query',
      };
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: luisResponse }),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: version._id,
        data: {
          api: {
            getVersion: sinon.stub().resolves(version),
            getProject: sinon.stub().resolves(project),
          },
        },
      };

      const result = await nlu.handle(context as any);

      expect(result).to.eql({ ...context, request: luisResponse });
    });

    it('works with production', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: query,
      };
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: luisResponse }),
        },
      };
      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: liveVersion,
        data: {
          api: {
            getVersion: sinon.stub().resolves(version),
            getProject: sinon.stub().resolves({
              ...project,
              liveVersion,
            }),
          },
        },
      };

      const result = await nlu.handle(context as any);

      expect(result).to.eql({ ...context, request: luisResponse });
      expect(services.axios.post.args[0][1]).to.eql({
        query,
        resourceID: nlp.resourceID,
        tag: VersionTag.PRODUCTION,
      });
    });

    it('rejects on invalid version', async () => {
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
        data: { api: { getVersion: sinon.stub().rejects() } },
      };
      await expect(nlu.handle(context as any)).to.eventually.be.rejectedWith('Version not found');
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
    });

    it('rejects with missing query', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: '',
      };

      const nlu = new NLUManager({ utils: { ...defaultUtils } } as any, config as any);

      const context = { request: oldRequest };

      const result = await nlu.handle(context as any);

      expect(result).to.eql({
        ...context,
        request: {
          ...noneIntent,
          payload: {
            ...noneIntent.payload,
            query: '',
          },
        },
      });
    });

    it('rejects with missing project', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: query,
      };

      const nlu = new NLUManager({ utils: { ...defaultUtils } } as any, config as any);

      const context = {
        request: oldRequest,
        versionID: liveVersion,
        data: {
          api: {
            getVersion: sinon.stub().resolves(version),
            getProject: sinon.stub().rejects('Could not find project'),
          },
        },
      };

      const result = nlu.handle(context as any);

      await expect(result).to.be.eventually.rejectedWith('Project not found');
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
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = await nlu.predict(arg);

      expect(result).to.eql(nlcMatchedIntent);
    });

    it('works with model and locale defined and intent is NONE_INTENT, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: luisResponse }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        model: { key: 'value' } as any,
        locale: Locale.EN_US,
        query: 'query-val',
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(noneIntent as any);

      const result = await nlu.predict(arg);

      expect(result).to.eql(luisResponse);
    });

    it('works with model and locale undefined, intent is not NONE_INTENT, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: luisResponse }),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        query: 'query-val',
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = await nlu.predict(arg);

      expect(result).to.eql(luisResponse);
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
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      await expect(nlu.predict(arg)).to.be.rejectedWith('Model not found');
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
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      await expect(nlu.predict(arg)).to.be.rejectedWith('Locale not found');
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
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand').returns(noneIntent as any);

      expect(await nlu.predict(arg)).to.eql(noneIntent);
      expect(handleNLCCommandStub.callCount).to.eql(2);
    });

    it('falls back to open regex slot matching if LUIS throws', async () => {
      const services = {
        axios: {
          post: sinon.stub().rejects('some-error'),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        query: 'query-val',
        nlp,
        tag: VersionTag.DEVELOPMENT,
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = nlu.predict(arg);

      await expect(result).to.be.rejectedWith('Model not found');
    });

    it('skip NLU prediction if not defined', async () => {
      const services = {
        axios: {
          post: sinon.stub().rejects('some-error'),
        },
      };

      const nlu = new NLUManager({ ...services, utils: { ...defaultUtils } } as any, config as any);

      const arg: Parameters<typeof nlu.predict>[0] = {
        query,
        nlp: undefined,
        tag,
        model,
        locale,
      };

      sinon.stub(NLC, 'handleNLCCommand').onCall(0).returns(noneIntent).onCall(1).returns(nlcMatchedIntent);

      const result = await nlu.predict(arg);

      expect(result).to.eql(nlcMatchedIntent);
    });
  });
});
