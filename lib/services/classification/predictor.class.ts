import { Utils } from '@voiceflow/common';
import { DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE } from '@voiceflow/default-prompt-wrappers';
import { IntentClassificationSettings } from '@voiceflow/dtos';
import { ISlotFullfilment } from '@voiceflow/natural-language-commander';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import type { AxiosStatic } from 'axios';
import { match } from 'ts-pattern';

import MLGateway from '@/lib/clients/ml-gateway';
import logger from '@/logger';

import { handleNLCCommand } from '../nlu/nlc';
import { mapChannelIntent } from '../nlu/utils';
import { isIntentClassificationLLMSettings, isIntentClassificationNLUSettings } from './classification.utils';
import {
  ClassificationResult,
  NLUIntentPrediction,
  NLUPredictOptions,
  PredictedSlot,
  Prediction,
  PredictOptions,
  PredictRequest,
} from './interfaces/nlu.interface';
import { executePromptWrapper } from './prompt-wrapper-executor';

const hasValueReducer = (slots?: ISlotFullfilment[]) =>
  (slots ?? []).reduce<{ name: string; value: string }[]>(
    (acc, { name, value }) => (value ? [...acc, { name, value }] : acc),
    []
  );

export interface PredictorConfig {
  axios: AxiosStatic;
  mlGateway: MLGateway;
  CLOUD_ENV: string;
  NLU_GATEWAY_SERVICE_HOST: string | null;
  NLU_GATEWAY_SERVICE_PORT_APP: string | null;
}

export class Predictor {
  private _predictions: Partial<ClassificationResult> = {};

  private _props: PredictRequest;

  private _settings: IntentClassificationSettings;

  private _options: PredictOptions;

  private _config: PredictorConfig;

  private _intentNameMap: any = {};

  constructor(
    config: PredictorConfig,
    props: PredictRequest,
    settings: IntentClassificationSettings,
    options: PredictOptions
  ) {
    this._config = config;
    this._props = props;
    this._settings = settings;
    this._options = options;
    // match NLU prediction intents to NLU model
    this._intentNameMap = Object.fromEntries(this._props.intents.map((intent) => [intent.name, intent]));
  }

  private get nluGatewayURL() {
    const protocol = this._config.CLOUD_ENV === 'e2e' ? 'https' : 'http';
    return `${protocol}://${this._config.NLU_GATEWAY_SERVICE_HOST}:${this._config.NLU_GATEWAY_SERVICE_PORT_APP}`;
  }

  // return all the same prediction shape?
  public async nlc(utterance: string, openSlot = false): Promise<Prediction | null> {
    if (!this._props.intents.length) {
      this._predictions.nlc = {
        openSlot,
        error: {
          message: 'No intents to match against',
        },
      };
      return null;
    }
    const data = handleNLCCommand({
      query: utterance,
      model: {
        intents: this._props.intents,
        slots: this._props.slots ?? [],
      },
      locale: this._options.locale,
      openSlot,
    });

    if (!data) {
      this._predictions.nlc = {
        openSlot,
        error: {
          message: 'No matches found',
        },
      };
      return null;
    }

    const response = {
      predictedIntent: mapChannelIntent(data?.intent),
      predictedSlots: hasValueReducer(data?.slots),
      confidence: data.confidence,
      utterance,
    };

    this._predictions.nlc = {
      ...this._predictions.nlc,
      ...response,
    };

    return response;
  }

  public async fillSlots(utterance: string, options?: NLUPredictOptions): Promise<PredictedSlot[] | null> {
    const { data: prediction } = await this._config.axios
      .post<NLUIntentPrediction | null>(`${this.nluGatewayURL}/v1/predict/${this._props.versionID}`, {
        utterance,
        tag: this._props.tag,
        workspaceID: this._props.workspaceID,
        filteredIntents: options?.filteredIntents ?? [],
        filteredEntities: options?.filteredEntities ?? [],
        excludeFilteredIntents: false,
        excludeFilteredEntities: false,
        limit: 10,
      })
      .catch((err: Error) => {
        logger.error(err, 'Something went wrong filling slots');
        return { data: null };
      });

    if (!prediction) {
      this._predictions.fillSlots = {
        error: {
          message: 'Something went wrong filling slots',
        },
      };
      return null;
    }

    this._predictions.fillSlots = prediction.predictedSlots;

    return prediction.predictedSlots;
  }

  public async nlu(utterance: string, options?: NLUPredictOptions): Promise<NLUIntentPrediction | null> {
    const { data: prediction } = await this._config.axios
      .post<NLUIntentPrediction | null>(`${this.nluGatewayURL}/v1/predict/${this._props.versionID}`, {
        utterance,
        tag: this._props.tag,
        workspaceID: this._props.workspaceID,
        filteredIntents: options?.filteredIntents ?? [],
        filteredEntities: options?.filteredEntities ?? [],
        excludeFilteredIntents: false,
        excludeFilteredEntities: false,
        limit: 10,
      })
      .catch((err: Error) => {
        logger.error(err, 'Something went wrong with NLU prediction');
        return { data: null };
      });

    if (!prediction) {
      this._predictions.nlu = {
        error: {
          message: 'Something went wrong with NLU prediction',
        },
      };
      return null;
    }

    this._predictions.nlu = prediction;

    if (
      isIntentClassificationNLUSettings(this._settings) &&
      prediction?.confidence < this._settings.params.confidence
    ) {
      this._predictions.nlu = {
        ...prediction,
        error: {
          message: 'NLU predicted confidence below settings threshold',
        },
      };
      return null;
    }

    return prediction;
  }

  public async llm(
    nluPrediction: NLUIntentPrediction,
    { mlGateway }: { mlGateway: MLGateway }
  ): Promise<Omit<Prediction, 'predictedSlots'> | null> {
    if (!isIntentClassificationLLMSettings(this._settings)) {
      return null;
    }

    const promptContent = this._settings.promptWrapper?.content ?? DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE;

    const intents = nluPrediction.intents
      // filter out none intent
      .filter((intent) => intent.name !== VoiceflowConstants.IntentName.NONE)
      .map((intent) => this._intentNameMap[intent.name])
      // TODO: PL-897
      .filter(Utils.array.isNotNullish);

    if (!intents.length) return nluPrediction;

    const promptArgs = {
      intents,
      query: nluPrediction.utterance,
    };

    let prompt;
    try {
      // TODO: await in Promise constructor won't catch
      prompt = await executePromptWrapper(promptContent, promptArgs);
    } catch (err) {
      // TODO: Error types for matching
      logger.error(err, 'PromptWrapperError: went real bad');
      this._predictions.llm = {
        error: {
          message: 'PromptWrapperError: went real bad',
        },
      };
      return null;
    }

    const completionResponse = await mlGateway.private?.completion
      .generateCompletion({
        workspaceID: this._props.workspaceID,
        prompt,
        params: {
          // TODO: models are different between ml gateway sdk and dtos package
          model: this._settings.params.model as any,
          temperature: this._settings.params.temperature,
        },
        options: {
          // TODO: remove magic number
          timeout: 5000,
        },
      })
      .catch((error: Error) => {
        logger.error(error, '[hybridPredict intent classification]');
        this._predictions.llm = {
          error: {
            message: `Falling back to NLU`,
          },
        };
        return null;
      });

    if (!completionResponse?.output) {
      this._predictions.llm = {
        error: {
          message: `unable to get LLM result, potential timeout`,
        },
      };
      return null;
    }

    // validate llm output as a valid intent
    const matchedIntent = this._props.intents.find((intent) => intent.name === completionResponse.output);

    this._predictions.llm = completionResponse;

    if (!matchedIntent) {
      this._predictions.llm = {
        ...this._predictions.llm,
        error: {
          message: "LLM prediction didn't match any intents, falling back to NLU",
        },
      };
      return null;
    }

    const response = {
      utterance: nluPrediction.utterance,
      predictedIntent: matchedIntent.name,
      predictedSlots: [],
      confidence: 100,
      model: completionResponse.model,
      multiplier: completionResponse.multiplier,
      tokens: completionResponse.tokens,
    };

    this._predictions.llm = response;

    return response;
  }

  public async predict(utterance: string): Promise<Prediction | null> {
    // 1. first try restricted regex (no open slots) - exact string match
    const nlcPrediction = await this.nlc(utterance, false);
    if (nlcPrediction) {
      this._predictions.result = 'nlc';
      return nlcPrediction;
    }

    const nluPrediction = await this.nlu(utterance, this._options);

    if (!nluPrediction) {
      // try open regex slot matching
      this._predictions.result = 'nlc';
      return this.nlc(utterance, true);
    }

    if (isIntentClassificationNLUSettings(this._settings)) {
      this._predictions.result = 'nlu';
      return nluPrediction;
    }

    if (isIntentClassificationLLMSettings(this._settings)) {
      const llmPrediction = await this.llm(nluPrediction, {
        mlGateway: this._config.mlGateway,
      });

      if (!llmPrediction) {
        // fallback to NLU prediction
        this._predictions.result = 'nlu';
        return nluPrediction;
      }

      this._predictions.result = 'llm';

      // STEP 4: retrieve intent from intent map
      const intent = this._intentNameMap[llmPrediction.predictedIntent];

      // slot filling
      const slots = await match({
        predicted: llmPrediction.predictedIntent === nluPrediction.predictedIntent,
        hasSlots: !!intent.slots?.length,
      })
        .with({ predicted: true }, () => nluPrediction.predictedSlots)
        .with({ predicted: false, hasSlots: true }, () =>
          this.fillSlots(utterance, {
            filteredIntents: [llmPrediction.predictedIntent],
          })
        )
        .otherwise(() => []);

      return {
        ...llmPrediction,
        predictedSlots: slots ?? [],
      };
    }

    // finally try open regex slot matching
    this._predictions.result = 'nlc';
    return this.nlc(utterance, true);
  }

  public hasErrors() {
    return this._predictions.nlc?.error || this._predictions.nlu?.error || this._predictions.llm?.error;
  }

  public get predictions(): Partial<ClassificationResult> {
    return this._predictions;
  }

  public get classificationType() {
    return this._settings.type;
  }
}
