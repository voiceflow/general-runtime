import { BaseUtils } from '@voiceflow/base-types';
import { GPT_MODEL, Message } from '@voiceflow/base-types/build/cjs/utils/ai';
import { CompiledCaptureV3NodeDTO, IntentRequest, isIntentRequest, RequestType } from '@voiceflow/dtos';

import logger from '@/logger';
import { Context, ContextHandler } from '@/types';

import { shouldDoLLMExtraction } from '../nlu/utils';
import { AbstractManager } from '../utils';
import { PromptWrapper } from './prompt-wrapper/prompt-wrapper.class';
import { PromptWrapperExtractionResultType } from './prompt-wrapper/prompt-wrapper.dto';
import { PromptWrapperModelParams } from './prompt-wrapper/prompt-wrapper.interface';

/**
 * Fake Data
 */
const llmParams: PromptWrapperModelParams = {
  model: GPT_MODEL.GPT_4o,
  temperature: 0.7,
  system: 'system',
  maxTokens: 1337,
};

// const transcript = runtime.variables.getState()[State.Key]
const transcript: Message[] = [
  {
    role: BaseUtils.ai.Role.SYSTEM,
    content: 'what is your name?',
  },
  {
    role: BaseUtils.ai.Role.USER,
    content: 'my name is Tom',
  },
];

const intentName = 'intent-name';
const intentCaptures = {
  [intentName]: {
    intentID: 'intent',
    nextStepID: 'next-id',
    entitiesExtraction: {
      // WithEntitiesExtractionRules
      rules: ['i am the first rule', 'i am the second rule'],
    },
    exitScenarios: {
      // WithExitScenarios
      scenarios: ['i am the first exit scenario'],
      hasPath: false,
      // nextStepID:
    },
  },
};

const captureIntent = {
  type: CompiledCaptureV3NodeDTO.shape.type.value,
  id: 'capture-intent',
  data: {
    type: 'synthetic-intent',
    intentCaptures,
    buttons: [], // should be optional
  },
  fallback: {}, // should be optional
};

// const isNoneIntent = (request: IntentRequest): boolean =>
//   request!.payload.intent.name !== VoiceflowConstants.IntentName.NONE;

export class ExtractionTurnHandler extends AbstractManager implements ContextHandler {
  canHandle = async (context: Context): Promise<boolean> =>
    // TODO: the case where it's NoneIntent but has slots filled or we know we're in the middle of filling
    // && !isNoneIntent(context.request)
    isIntentRequest(context.request) && shouldDoLLMExtraction(context);

  async handle(context: Context) {
    const can = await this.canHandle(context);
    if (!can) {
      return context;
    }

    const parsedIntent = CompiledCaptureV3NodeDTO.safeParse(captureIntent);

    if (!parsedIntent.success) {
      logger.error(parsedIntent.error.issues);
      return context;
    }

    const intent = intentCaptures[intentName];
    const utterance = (context.request as IntentRequest).payload.query;

    const llmWrapper = new PromptWrapper(this.services.mlGateway)
      .withModelParams(llmParams)
      .withTranscripts(transcript)
      .withUtterance(utterance)
      .withContext({
        projectID: context.runtime.project!._id,
        workspaceID: context.runtime.project!.teamID,
      });

    if (intent.entitiesExtraction.rules?.length > 0) {
      llmWrapper.withRules(intent.entitiesExtraction.rules);
    }

    if (context.runtime.version?.prototype?.model?.slots?.length) {
      llmWrapper.withSlots(context.runtime.version.prototype.model.slots);
    }

    if (intent.exitScenarios.scenarios.length > 0) {
      llmWrapper.withExitScenarios(intent.exitScenarios.scenarios);
    }

    const [result, sideEffects] = await llmWrapper.exec();

    logger.info({ result, sideEffects });

    // TODO: exit scenarios, reprompt, etc

    if (!result) {
      // TODO: how to handle no result
      throw new Error();
    }

    if (result.type === PromptWrapperExtractionResultType.enum.exit) {
      logger.info(result.rationale);
      return {
        ...context,
        request: {
          type: RequestType.EXIT_SCENARIO,
        },
      };
    }

    return context;
  }
}
