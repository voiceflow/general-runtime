import { isIntentRequest } from '@voiceflow/dtos';

import logger from '@/logger';
import { Context, ContextHandler } from '@/types';

import { shouldDoLLMExtraction } from '../nlu/utils';
import { AbstractManager } from '../utils';
import { PromptWrapper } from './prompt-wrapper/prompt-wrapper.class';

export class ExtractionTurnHandler extends AbstractManager implements ContextHandler {
  canHandle = async (context: Context): Promise<boolean> =>
    isIntentRequest(context.request) && !(await shouldDoLLMExtraction(context));

  async handle(context: Context) {
    if (!(await this.canHandle(context))) {
      return context;
    }

    const llmWrapper = new PromptWrapper(this.services.mlGateway);
    // .withParams(data.capture.automaticReprompt?.params)
    // .withMemory(runtime.variables.getState())
    // .withRules(rules)
    // .withExitScenarios(exitScenarios)
    // .withEntities(entityRefs)
    // .withUtterance(utterance)
    // .withContext({
    //   projectID: context.runtime.project?._id,
    //   workspaceID: context.runtime.project!.teamID,
    // });

    logger.info(llmWrapper);
    // const parsedData = llmWrapper.exec();

    // TODO: exit scenarios, reprompt, etc

    return context;
  }
}
