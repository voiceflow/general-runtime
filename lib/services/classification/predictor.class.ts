import { DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE } from '@voiceflow/default-prompt-wrappers';
import { IntentClassificationSettings } from '@voiceflow/dtos';
import { ISlotFullfilment } from '@voiceflow/natural-language-commander';
import type { AxiosStatic } from 'axios';

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
  private _predictions: any = {};

  private _props: PredictRequest;

  private _settings: IntentClassificationSettings;

  private _options: PredictOptions;

  private _config: PredictorConfig;

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
    logger.info({ nluGatewayURL: this.nluGatewayURL });
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

    logger.info({ prediction });

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
        errors: {
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

    const intents = nluPrediction.intents.map((predictedIntent) => {
      const intent = this._props.intents.find((intent) => intent.name === predictedIntent.name);
      if (!intent) {
        throw new Error(`Missing predicted intent: ${predictedIntent.name}`);
      }

      return {
        name: predictedIntent.name,
        description: intent.description,
      };
    });

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
      this._predictions.llm = {
        errors: {
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
          errors: {
            message: `Falling back to NLU`,
          },
        };
        return null;
      });

    if (!completionResponse?.output) {
      this._predictions.llm = {
        errors: {
          message: `unable to get LLM result, potential timeout`,
        },
      };
      return null;
    }

    // validate llm output as a valid intent
    const matchedIntent = this._props.intents.find((intent) => intent.name === completionResponse.output);

    this._predictions.llm = { completionResponse };

    if (!matchedIntent) {
      this._predictions.llm = {
        ...this._predictions.llm,
        errors: {
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
      return nlcPrediction;
    }

    const nluPrediction = await this.nlu(utterance, this._options);

    if (!nluPrediction) {
      logger.info('nothing found for nlu');
      // try open regex slot matching
      return this.nlc(utterance, true);
    }

    logger.info('beep nlu');
    if (isIntentClassificationNLUSettings(this._settings)) {
      logger.info('nlu and succes');
      return nluPrediction;
    }

    logger.info('trying llm');
    logger.info({ settings: this._settings });
    logger.info({ nluPrediction });
    if (isIntentClassificationLLMSettings(this._settings)) {
      const llmPrediction = await this.llm(nluPrediction, {
        mlGateway: this._config.mlGateway,
      });

      if (!llmPrediction) {
        // fallback to NLU prediction
        logger.info('falling back');
        return nluPrediction;
      }

      logger.info('filling slots');
      // slot filling
      const slots = await this.fillSlots(utterance, {
        filteredIntents: [llmPrediction.predictedIntent],
      });

      logger.info('got it');

      return {
        ...llmPrediction,
        predictedSlots: slots ?? [],
      };
    }

    logger.info('last nlc');
    // finally try open regex slot matching
    return this.nlc(utterance, true);
  }

  public hasErrors() {
    return this._predictions.nlc.errors || this._predictions.nlu.errors || this._predictions.llm.errors;
  }

  public get predictions(): ClassificationResult {
    return this._predictions;
  }
}
