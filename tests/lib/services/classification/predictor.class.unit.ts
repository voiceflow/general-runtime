import { BaseRequest } from '@voiceflow/base-types';
import { IntentClassificationSettings, PrototypeModel, Version } from '@voiceflow/dtos';
import { CompletionPrivateHTTPControllerGenerateCompletion200 } from '@voiceflow/sdk-http-ml-gateway/generated';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import { Predictor } from '@/lib/services/classification';
import {
  NLUIntentPrediction,
  PredictOptions,
  PredictRequest,
} from '@/lib/services/classification/interfaces/nlu.interface';
import * as NLC from '@/lib/services/nlu/nlc';
import { VersionTag } from '@/types';

chai.use(chaiAsPromised);
const { expect } = chai;

const GENERAL_SERVICE_ENDPOINT = 'http://localhost:6970';
const config = {
  GENERAL_SERVICE_ENDPOINT,
  CLOUD_ENV: '',
  NLU_GATEWAY_SERVICE_HOST: '',
  NLU_GATEWAY_SERVICE_PORT_APP: '',
};

describe('predictor unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });
  const orderPizzaIntentPrediction = { name: 'Order Pizza', confidence: 1 };
  const orderPizzaIntent = {
    name: 'Order Pizza',
    description: 'order a pizza',
    inputs: [],
    key: 'pizzaKey',
  };
  const model: PrototypeModel = {
    slots: [],
    intents: [orderPizzaIntent],
  };
  const tag = VersionTag.PRODUCTION;
  const locale = VoiceflowConstants.Locale.DE_DE;
  const query = 'I would like a large sofa pizza with extra chair';
  const version: Pick<Version, '_id' | 'projectID' | 'prototype'> = {
    _id: 'version-id',
    projectID: 'project-id',
    prototype: {
      model,
    } as Version['prototype'],
  };
  const teamID = 10;
  const project = {
    liveVersion: '1',
    devVersion: '2',
    teamID,
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

  const nluGatewayPrediction: NLUIntentPrediction = {
    utterance: query,
    predictedIntent: orderPizzaIntent.name,
    predictedSlots: [],
    confidence: 1,
    intents: [orderPizzaIntentPrediction],
  };

  const defaultProps: PredictRequest;
  const defaultSettings: IntentClassificationSettings;
  const defaultOptions: PredictOptions;
  const defaultConfig: PredictorConfig = {
    axios: {
      post: sinon.stub().resolves({ data: nluGatewayPrediction }),
    },
    mlGateway: {
      private: {
        completion: {
          generateCompletion: sinon.stub().resolves({} as CompletionPrivateHTTPControllerGenerateCompletion200),
        },
      },
    },
  };

  describe('nlc', () => {
    it('works with openSlot false', () => { });
    it('works with openSlot true', () => { });
  });
  describe('nlu', () => { });
  describe('llm', () => { });

  describe('predict', () => {
    it('works with model and locale defined and intent is not VoiceflowConstants.IntentName.NONE', () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: {} }),
        },
      };

      const query = 'query-val';
      const props = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
      };
      const settings: IntentClassificationSettings = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = classification.predict(props, settings, query);

      expect(result).to.eventually.eql(nlcMatchedIntent);
    });

    it('works with model and locale defined and intent is VoiceflowConstants.IntentName.NONE, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: nluGatewayPrediction }),
        },
      };
      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);

      const query = 'query-val';
      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
        locale: VoiceflowConstants.Locale.EN_US,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(noneIntent as any);

      const result = await classification.predict(props, settings, query);

      expect(result).to.eql(intentResponse);
    });

    it('works with model and locale undefined, intent is not VoiceflowConstants.IntentName.NONE, prediction is not empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: nluGatewayPrediction }),
        },
      };
      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);

      const query = 'query-val';
      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = await classification.predict(props, settings, query);

      expect(result).to.eql(intentResponse);
    });

    it('works with model and locale undefined, intent is not VoiceflowConstants.IntentName.NONE, prediction empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: undefined }),
        },
      };
      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);

      const query = 'query-val';
      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      await expect(classification.predict(props, settings, query)).to.be.rejectedWith('Model not found');
    });

    it('works with model and locale defined, intent is VoiceflowConstants.IntentName.NONE, prediction is empty', async () => {
      const services = {
        axios: {
          post: sinon.stub().resolves({ data: undefined }),
        },
      };
      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);
      const query = 'query-val';
      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
        locale: VoiceflowConstants.Locale.EN_US,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand').returns(noneIntent as any);

      expect(await classification.predict(props, settings, query)).to.eql(noneIntent);
      expect(handleNLCCommandStub.callCount).to.eql(2);
    });

    it('falls back to open regex slot matching if LUIS throws', async () => {
      const services = {
        axios: {
          post: sinon.stub().rejects('some-error'),
        },
      };

      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);

      const query = 'query-val';
      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag: VersionTag.DEVELOPMENT,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      sinon.stub(NLC, 'handleNLCCommand').returns(nlcMatchedIntent as any);

      const result = await classification.predict(props, settings, query);

      await expect(result).to.be.rejectedWith('Model not found');
    });

    it('skip NLU prediction if not defined', async () => {
      const services = {
        axios: {
          post: sinon.stub().rejects('some-error'),
        },
      };

      const classification = new ClassificationService({ ...services, utils: {} } as any, config as any);

      const props: Parameters<typeof classification.predict>[0] = {
        ...model,
        versionID: version._id,
        workspaceID: String(project.teamID),
        tag,
        locale,
      };
      const settings: Parameters<typeof classification.predict>[1] = {
        type: 'nlu',
        params: {
          confidence: 0.5,
        },
      };

      sinon.stub(NLC, 'handleNLCCommand').onCall(0).returns(noneIntent).onCall(1).returns(nlcMatchedIntent);

      const result = await classification.predict(props, settings, query);

      expect(result).to.eql(nlcMatchedIntent);
    });
  });
});
