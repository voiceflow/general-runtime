import { BaseRequest } from '@voiceflow/base-types';
import { PrototypeModel, Version } from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import { NLUIntentPrediction } from '@/lib/services/classification/interfaces/nlu.interface';
import NLUManager from '@/lib/services/nlu';
import { VersionTag } from '@/types';

import { getMockRuntime } from './fixture';

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

  const orderPizzaIntent = { name: 'Order Pizza', confidence: 1 };
  const model: PrototypeModel = {
    slots: [],
    intents: [
      {
        name: orderPizzaIntent.name,
        key: orderPizzaIntent.name,
        inputs: [],
      },
    ],
  };
  const query = 'I would like a large sofa pizza with extra chair';
  const version: Pick<Version, '_id' | 'projectID' | 'prototype' | 'settings'> = {
    _id: 'version-id',
    projectID: 'project-id',
    prototype: {
      model,
      data: {
        locales: [VoiceflowConstants.Locale.EN_US],
      },
      platform: VoiceflowConstants.PlatformType.VOICEFLOW,
    } as Version['prototype'],
    settings: {
      intentClassification: {
        type: 'nlu',
        params: {
          confidence: 0.6,
        },
      },
    },
  };
  const teamID = 10;
  const project = {
    liveVersion: '1',
    devVersion: '2',
    teamID,
    prototype: {
      nlp: true,
    },
  };
  const liveVersion = 'some-live-version';

  const nlcMatchedIntent: BaseRequest.IntentRequest = {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      intent: {
        name: 'abcedfg',
      },
      query,
      entities: [],
      confidence: 0.56,
    },
  };

  const noneIntent: BaseRequest.IntentRequest = {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      intent: {
        name: VoiceflowConstants.IntentName.NONE,
      },
      query,
      entities: [],
    },
  };
  const intentResponse = {
    type: BaseRequest.RequestType.INTENT,
    payload: {
      confidence: 1,
      query,
      intent: {
        name: orderPizzaIntent.name,
      },
      entities: [],
    },
  };

  const nluGatewayPrediction: NLUIntentPrediction = {
    utterance: query,
    predictedIntent: orderPizzaIntent.name,
    predictedSlots: [],
    confidence: 1,
    intents: [orderPizzaIntent],
  };

  describe('handle', () => {
    it('works', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: 'query',
      };
      const runtimeClient = {
        createRuntime: sinon.stub().returns(getMockRuntime()),
      };
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: nluGatewayPrediction }),
        },
        runtime: {
          createClient: sinon.stub().returns(runtimeClient),
        },
      };
      const nlu = new NLUManager({ ...services, utils: {} } as any, config as any);

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
        runtime: getMockRuntime(),
      };
      const result = await nlu.handle(context as any);

      expect(result).to.eql({ ...context, request: intentResponse });
    });

    it('works with production', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: query,
      };
      const runtimeClient = {
        createRuntime: sinon.stub().returns(getMockRuntime()),
      };
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: nluGatewayPrediction }),
        },
        runtime: {
          createClient: sinon.stub().returns(runtimeClient),
        },
      };
      const nlu = new NLUManager({ ...services, utils: {} } as any, config as any);

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
        runtime: getMockRuntime(),
      };

      const result = await nlu.handle(context as any);

      expect(result).to.eql({ ...context, request: intentResponse });
      expect(services.axios.post.args[0][1]).to.eql({
        filteredIntents: [],
        excludeFilteredIntents: true,
        utterance: query,
        tag: VersionTag.PRODUCTION,
        limit: 10,
        workspaceID: teamID,
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
      const nlu = new NLUManager({ ...services, utils: {} } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().rejects() } },
        runtime: getMockRuntime(),
      };
      await expect(nlu.handle(context as any)).to.eventually.be.rejectedWith();
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
      const nlu = new NLUManager({ ...services, utils: {} } as any, config as any);

      const context = {
        request: oldRequest,
        state: { foo: 'bar' },
        versionID: 'version-id',
        runtime: getMockRuntime(),
      };
      expect(await nlu.handle(context as any)).to.eql(context);
    });

    it('rejects with missing query', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: '',
      };

      const nlu = new NLUManager({ utils: {} } as any, config as any);

      const context = { request: oldRequest, runtime: getMockRuntime() };

      const result = await nlu.handle(context as any);

      expect(result).to.eql({
        ...context,
        request: {
          ...noneIntent,
          payload: {
            ...noneIntent.payload,
            query: '',
            confidence: undefined,
          },
        },
      });
    });

    it('rejects with missing project', async () => {
      const oldRequest = {
        type: BaseRequest.RequestType.TEXT,
        payload: query,
      };

      const nlu = new NLUManager({ utils: {} } as any, config as any);

      const context = {
        request: oldRequest,
        versionID: liveVersion,
        data: {
          api: {
            getVersion: sinon.stub().resolves(version),
          },
        },
        runtime: getMockRuntime(),
      };

      const result = nlu.handle(context as any);

      await expect(result).to.be.eventually.rejectedWith();
    });
  });
});
