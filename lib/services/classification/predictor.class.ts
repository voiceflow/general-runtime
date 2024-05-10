import { Utils } from '@voiceflow/common';
import { DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE } from '@voiceflow/default-prompt-wrappers';
import { IntentClassificationSettings } from '@voiceflow/dtos';
import { ISlotFullfilment } from '@voiceflow/natural-language-commander';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import type { AxiosStatic } from 'axios';
import { EventEmitter } from 'node:events';
import { match } from 'ts-pattern';

import { MLGateway } from '@/lib/clients/ml-gateway';
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

export enum DebugType {
  LLM = 'llm',
  NLU = 'nlu',
}

export interface DebugEvent {
  message: string;
  type: DebugType;
}

const ML_GATEWAY_TIMEOUT = 5000;

const nonePrediction: Omit<Prediction, 'utterance'> = {
  predictedIntent: VoiceflowConstants.IntentName.NONE,
  predictedSlots: [],
  confidence: 1,
};

const hasValueReducer = (slots?: ISlotFullfilment[]) =>
  (slots ?? []).reduce<{ name: string; value: string }[]>(
    (acc, { name, value }) => (value ? [...acc, { name, value }] : acc),
    []
  );

export interface PredictorConfig {
  axios: AxiosStatic;
  mlGateway: MLGateway;
  CLOUD_ENV: string;
  NLU_GATEWAY_SERVICE_URI: string | null;
  NLU_GATEWAY_SERVICE_PORT_APP: string | null;
}

export class Predictor extends EventEmitter {
  private intentNameMap: any = {};

  readonly predictions: Partial<ClassificationResult> = {};

  constructor(
    private config: PredictorConfig,
    private props: PredictRequest,
    private settings: IntentClassificationSettings,
    private options: PredictOptions
  ) {
    super();
    // match NLU prediction intents to NLU model
    this.intentNameMap = Object.fromEntries(props.intents.map((intent) => [intent.name, intent]));
  }

  private get nluGatewayURL() {
    const protocol = this.config.CLOUD_ENV === 'e2e' ? 'https' : 'http';
    return `${protocol}://${this.config.NLU_GATEWAY_SERVICE_URI}:${this.config.NLU_GATEWAY_SERVICE_PORT_APP}`;
  }

  private debug(type: DebugType, message?: string) {
    this.emit('debug', { type, message });
  }

  // return all the same prediction shape?
  public async nlc(utterance: string, openSlot = false): Promise<Prediction | null> {
    if (!this.props.intents.length) {
      this.predictions.nlc = {
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
        intents: this.props.intents,
        slots: this.props.slots ?? [],
      },
      locale: this.options.locale,
      openSlot,
      dmRequest: this.props.dmRequest,
    });

    if (!data) {
      this.predictions.nlc = {
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

    this.predictions.nlc = {
      ...this.predictions.nlc,
      ...response,
      openSlot,
    };

    return response;
  }

  public async fillSlots(utterance: string, options: Partial<NLUPredictOptions>): Promise<PredictedSlot[] | null> {
    const prediction = await this.nluGatewayPrediction(utterance, {
      excludeFilteredIntents: false,
      ...options,
    });

    if (!prediction) {
      this.predictions.fillSlots = {
        error: {
          message: 'Something went wrong filling slots',
        },
      };
      return null;
    }

    this.predictions.fillSlots = prediction.predictedSlots;

    return prediction.predictedSlots;
  }

  private async nluGatewayPrediction(utterance: string, options: Partial<NLUPredictOptions>) {
    const { filteredIntents = [], excludeFilteredIntents = true } = options;

    const { data: prediction } = await this.config.axios
      .post<NLUIntentPrediction | null>(`${this.nluGatewayURL}/v1/predict/${this.props.versionID}`, {
        utterance,
        tag: this.props.tag,
        workspaceID: this.props.workspaceID,
        filteredIntents,
        excludeFilteredIntents,
        limit: 10,
      })
      .catch((err: Error) => {
        logger.error(err, 'Something went wrong with NLU prediction');
        return { data: null };
      });
    return prediction;
  }

  public async nlu(utterance: string, options: Partial<NLUPredictOptions>): Promise<NLUIntentPrediction | null> {
    const prediction = await this.nluGatewayPrediction(utterance, options);
    if (!prediction) {
      this.predictions.nlu = {
        error: {
          message: 'Something went wrong with NLU prediction',
        },
      };
      this.debug(DebugType.NLU, this.predictions.nlu.error?.message);
      return null;
    }

    this.predictions.nlu = prediction;

    if (isIntentClassificationNLUSettings(this.settings) && prediction?.confidence < this.settings.params.confidence) {
      this.predictions.nlu = {
        ...prediction,
        error: {
          message: 'NLU predicted confidence below settings threshold',
        },
      };
      this.debug(DebugType.NLU, this.predictions.nlu.error?.message);
      return null;
    }

    return prediction;
  }

  public async llm(
    nluPrediction: NLUIntentPrediction,
    { mlGateway }: { mlGateway: MLGateway }
  ): Promise<Omit<Prediction, 'predictedSlots'> | null> {
    const mlGatewayClient = await mlGateway.getClient();
    if (!mlGatewayClient) return null;

    if (!isIntentClassificationLLMSettings(this.settings)) {
      return null;
    }

    const promptContent = this.settings.promptWrapper?.content ?? DEFAULT_INTENT_CLASSIFICATION_PROMPT_WRAPPER_CODE;

    const intents = nluPrediction.intents
      // filter out none intent
      .filter((intent) => intent.name !== VoiceflowConstants.IntentName.NONE)
      .map((intent) => this.intentNameMap[intent.name])
      // TODO: PL-897
      .filter(Utils.array.isNotNullish);

    if (!intents.length) return nluPrediction;

    const promptArgs = {
      intents,
      query: nluPrediction.utterance,
    };

    let prompt;
    try {
      const result = await executePromptWrapper(promptContent, promptArgs);
      prompt = result.prompt;
    } catch (err) {
      logger.error(err, 'Prompt wrapper execution error');
      this.predictions.llm = {
        error: {
          message: 'Prompt wrapper execution error. Please review your prompt wrapper syntax.',
        },
      };
      this.debug(DebugType.LLM, this.predictions.llm.error?.message);
      return null;
    }

    const completionResponse = await mlGatewayClient.private?.completion
      .generateCompletion({
        workspaceID: this.props.workspaceID,
        prompt,
        params: {
          // TODO: models are different between ml gateway sdk and dtos package
          model: this.settings.params.model,
          temperature: this.settings.params.temperature,
        },
        options: {
          timeout: ML_GATEWAY_TIMEOUT,
        },
      })
      .catch((error: Error) => {
        logger.error(error, '[hybridPredict intent classification]');
        this.debug(DebugType.LLM, 'Falling back to NLU');
        return null;
      });

    if (!completionResponse?.output) {
      this.predictions.llm = {
        error: {
          message: `LLM response timeout. Please retry.`,
        },
      };
      this.debug(DebugType.LLM, this.predictions.llm.error?.message);
      return null;
    }

    // validate llm output as a valid intent
    const matchedIntent = this.props.intents.find((intent) => intent.name === completionResponse.output);
    const { error } = completionResponse;

    this.predictions.llm = {
      ...completionResponse,
      error: !error ? undefined : { message: error },
    };

    if (!matchedIntent) {
      this.predictions.llm = {
        ...this.predictions.llm,
        error: {
          message: 'LLM could not match any intents. Defaulting to NLU for classification.',
        },
      };
      this.debug(DebugType.LLM, this.predictions.llm.error?.message);
      return null;
    }

    const response = {
      utterance: nluPrediction.utterance,
      predictedIntent: matchedIntent.name,
      predictedSlots: [],
      confidence: 1,
      model: completionResponse.model,
      multiplier: completionResponse.multiplier,
      tokens: completionResponse.tokens,
    };

    this.predictions.llm = response;

    this.debug(
      DebugType.LLM,
      `<pre>
         intent: ${response.predictedIntent}
         model: ${response.model}
         multiplier: ${response.multiplier}
         tokens: ${response.tokens}
       </pre>`
    );

    return response;
  }

  public async predict(utterance: string): Promise<Prediction | null> {
    // 1. first try restricted regex (no open slots) - exact string match
    const nlcPrediction = !isIntentClassificationLLMSettings(this.settings) ? await this.nlc(utterance, false) : null;
    if (nlcPrediction) {
      this.predictions.result = 'nlc';
      return nlcPrediction;
    }

    const nluPrediction = this.props.isTrained && (await this.nlu(utterance, this.options));

    if (!nluPrediction) {
      // try open regex slot matching
      this.debug(DebugType.NLU, `No matching intents`);

      if (isIntentClassificationLLMSettings(this.settings)) {
        // No NLC when LLM enabled
        return { ...nonePrediction, utterance };
      }

      this.predictions.result = 'nlc';
      const openPrediction = await this.nlc(utterance, true);
      return (
        openPrediction ?? {
          ...nonePrediction,
          utterance,
        }
      );
    }

    if (isIntentClassificationNLUSettings(this.settings)) {
      this.predictions.result = 'nlu';
      return nluPrediction;
    }

    const intentDebugMessage = nluPrediction.intents
      .map((intent) => `${intent.name} (${Math.round(intent.confidence * 100)}%)`)
      .join('<br />');
    this.debug(DebugType.NLU, `<pre>Top ${nluPrediction.intents.length}:<br/>${intentDebugMessage}</pre>`);

    if (isIntentClassificationLLMSettings(this.settings) && !this.props.dmRequest?.intent) {
      const llmPrediction = await this.llm(nluPrediction, {
        mlGateway: this.config.mlGateway,
      });

      if (!llmPrediction) {
        // fallback to NLU prediction
        this.predictions.result = 'nlu';
        this.debug(DebugType.LLM, `Falling back to NLU`);
        return nluPrediction;
      }

      this.predictions.result = 'llm';

      // STEP 4: retrieve intent from intent map
      const intent = this.intentNameMap[llmPrediction.predictedIntent];

      // slot filling
      const slots = await match({
        predicted: llmPrediction.predictedIntent === nluPrediction.predictedIntent,
        hasSlots: !!intent.slots?.length,
      })
        .with({ hasSlots: true }, () =>
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
    this.predictions.result = 'nlc';
    const openPrediction = await this.nlc(utterance, true);
    return (
      openPrediction ?? {
        ...nonePrediction,
        utterance,
      }
    );
  }

  public hasErrors() {
    return this.predictions.nlc?.error || this.predictions.nlu?.error || this.predictions.llm?.error;
  }

  public get classificationType() {
    return this.settings.type;
  }
}
