import { BaseRequest } from '@voiceflow/base-types';
import { IntentClassificationSettings, PrototypeModel, Version } from '@voiceflow/dtos';
import { CompletionPrivateHTTPControllerGenerateCompletion200 } from '@voiceflow/sdk-http-ml-gateway/generated';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import { Predictor, PredictorConfig } from '@/lib/services/classification';
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
const defaultConfig = {
  GENERAL_SERVICE_ENDPOINT,
  CLOUD_ENV: '',
  NLU_GATEWAY_SERVICE_URI: '',
  NLU_GATEWAY_SERVICE_PORT_APP: '',
};

describe('predictor unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });
  const pizzaAmountSlot = {
    key: '123xyz',
    name: 'pizzaAmount',
    type: { value: 'VF.NUMBER' },
    inputs: [],
  };
  const orderPizzaIntentPrediction = { name: 'Order Pizza', confidence: 1 };
  const orderPizzaIntent = {
    name: 'Order Pizza',
    description: 'order a pizza',
    inputs: [],
    key: 'pizzaKey',
  };
  const orderPizzaIntentWithSlots = {
    name: 'Order Many Pizzas',
    description: 'order many pizzas',
    inputs: [],
    slots: [
      {
        id: pizzaAmountSlot.key,
        required: true,
      },
    ],
    key: 'pizzaAmountKey',
  };
  const orderPizzaIntentWithSlotsPrediction = {
    name: orderPizzaIntentWithSlots.name,
    confidence: 1,
  };
  const model: PrototypeModel = {
    slots: [],
    intents: [orderPizzaIntent],
  };
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
    prototype: {
      nlp: true,
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

  const nlcPrediction: IIntentFullfilment & { confidence: number } = {
    intent: 'abcedfg',
    slots: [],
    confidence: 0.56,
  };

  const nluGatewayPrediction: NLUIntentPrediction = {
    utterance: query,
    predictedIntent: orderPizzaIntent.name,
    predictedSlots: [],
    confidence: 1,
    intents: [orderPizzaIntentPrediction],
  };

  const defaultProps: PredictRequest = {
    ...model,
    versionID: version._id,
    workspaceID: String(project.teamID),
    tag: VersionTag.DEVELOPMENT,
    isTrained: true,
  };
  const defaultSettings: IntentClassificationSettings = {
    type: 'nlu',
    params: {
      confidence: 0.5,
    },
  };
  const defaultOptions: PredictOptions = {
    hasChannelIntents: false,
    platform: VoiceflowConstants.PlatformType.VOICEFLOW,
  };

  const mlGatewayPrediction = {
    output: orderPizzaIntent.name,
    tokens: 1205,
    queryTokens: 12,
    answerTokens: 21,
    multiplier: 0.3,
    model: 'gpt-4-turbo',
  };

  const setup = ({ axios, mlGateway, props, settings, options }: any) => ({
    config: {
      ...defaultConfig,
      axios: {
        post: sinon.stub().resolves(axios ?? { data: nluGatewayPrediction }),
      },
      mlGateway: {
        private: {
          completion: {
            generateCompletion: sinon
              .stub()
              .resolves((mlGateway ?? mlGatewayPrediction) as CompletionPrivateHTTPControllerGenerateCompletion200),
          },
        },
      },
    } as unknown as PredictorConfig,
    props: {
      ...defaultProps,
      ...props,
    } as unknown as PredictRequest,
    settings: {
      intentClassification: {
        ...defaultSettings,
        ...settings,
      } as IntentClassificationSettings,
    },
    options: {
      ...defaultOptions,
      ...options,
    } as PredictOptions,
  });

  describe('nlc', () => {
    it('works with openSlot false', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({});
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcPrediction as any);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(prediction?.predictedIntent).to.eql(nlcPrediction.intent);
      expect(result).to.eql('nlc');
    });

    it('none intent when no intents', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        props: {
          intents: [],
          slots: [],
        },
        axios: { data: null },
      });
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      sinon.stub(NLC, 'handleNLCCommand').returns(nlcPrediction as any);

      const prediction = await predictor.predict(utterance);

      expect(prediction?.predictedIntent).to.eql(VoiceflowConstants.IntentName.NONE);
    });
  });

  describe('nlu', () => {
    it('works', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({});
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      sinon.stub(NLC, 'handleNLCCommand').returns(null);

      const prediction = await predictor.predict(utterance);

      expect(prediction).to.eql(nluGatewayPrediction);
    });

    it('nlc fallback - openSlot: false', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        axios: { data: null },
      });
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.onCall(0).returns(null);
      handleNLCCommandStub.onCall(1).returns(nlcPrediction as any);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      sinon.assert.called(config.axios.post);
      expect(handleNLCCommandStub.callCount).to.eql(2);
      expect(prediction?.predictedIntent).to.eql(nlcPrediction.intent);
      expect(result).to.eql('nlc');
    });

    it('not called when nlp false', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        axios: { data: null },
        props: { isTrained: false },
      });
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.returns(nlcPrediction as any);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      sinon.assert.notCalled(config.axios.post);
      expect(handleNLCCommandStub.callCount).to.eql(1);
      expect(prediction?.predictedIntent).to.eql(nlcPrediction.intent);
      expect(result).to.eql('nlc');
    });
  });

  describe('llm', () => {
    it('works', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });

      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.returns(null);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(result).to.eql('llm');
      expect(prediction?.predictedIntent).to.eql(mlGatewayPrediction.output);
    });

    it('skips if NLU fails', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        axios: { data: null },
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });
      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      sinon.assert.called(config.axios.post);
      sinon.assert.notCalled(config.mlGateway.private?.completion.generateCompletion);
      expect(handleNLCCommandStub.callCount).to.eql(0);
      expect(prediction?.predictedIntent).to.eql(VoiceflowConstants.IntentName.NONE);
      expect(result).not.to.eql('nlc');
    });

    it('uses slots from NLU if same prediction', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });

      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.returns(null);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(result).to.eql('llm');
      expect(config.axios.post.callCount).to.eql(1);
      expect(prediction?.predictedIntent).to.eql(mlGatewayPrediction.output);
    });

    it('fills slots if prediction different than NLU', async () => {
      const utterance = 'query-val';
      const predictionWithSlots = {
        ...mlGatewayPrediction,
        output: orderPizzaIntentWithSlots.name,
      };
      const { config, props, settings, options } = setup({
        props: {
          intents: [orderPizzaIntent, orderPizzaIntentWithSlots],
          slots: [pizzaAmountSlot],
        },
        axios: { data: { ...nluGatewayPrediction, predictionIntent: 'womp' } },
        mlGateway: predictionWithSlots,
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });

      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.returns(null);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(result).to.eql('llm');
      expect(config.axios.post.callCount).to.eql(2);
      expect(prediction?.predictedIntent).to.eql(predictionWithSlots.output);
    });

    it('skips NLC', async () => {
      const utterance = 'query-val';
      const predictionWithSlots = {
        ...mlGatewayPrediction,
        output: orderPizzaIntentWithSlots.name,
      };
      const { config, props, settings, options } = setup({
        props: {
          intents: [orderPizzaIntentWithSlots],
          slots: [pizzaAmountSlot],
        },
        axios: {
          data: {
            ...nluGatewayPrediction,
            predictionIntent: orderPizzaIntentWithSlots.name,
            intents: [orderPizzaIntentWithSlotsPrediction],
          },
        },
        mlGateway: predictionWithSlots,
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });

      const predictor = new Predictor(config, props, settings.intentClassification, options);
      const handleNLCCommandStub = sinon.stub(NLC, 'handleNLCCommand');
      handleNLCCommandStub.returns(nlcPrediction as any);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(result).to.eql('llm');
      expect(prediction?.predictedIntent).to.eql(predictionWithSlots.output);
      expect(prediction?.predictedIntent).not.to.eql(nlcPrediction.output);
    });

    it('no NLC on NLU failure', async () => {
      const utterance = 'query-val';
      const { config, props, settings, options } = setup({
        axios: { data: null },
        settings: {
          type: 'llm',
          params: { model: 'gpt-4-turbo', temperature: 0.7 },
        },
      });
      const predictor = new Predictor(config, props, settings.intentClassification, options);

      const prediction = await predictor.predict(utterance);
      const { result } = predictor.predictions;

      expect(prediction?.predictedIntent).to.eql(VoiceflowConstants.IntentName.NONE);
      expect(result).not.to.eql('nlc');
    });
  });
});
