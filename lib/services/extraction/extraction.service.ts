import { AbstractManager } from "../utils";
import { Context, ContextHandler } from "@/types";
import { PromptWrapper } from "./prompt-wrapper/prompt-wrapper.class";


export class ExtractionTurnHandler extends AbstractManager implements ContextHandler {

  async handle(context: Context) {

    const llmWrapper = new PromptWrapper(this.services.mlGateway)
    // .withParams(data.capture.automaticReprompt?.params)
    //   .withMemory(runtime.variables.getState())
    //   .withRules(rules)
    //   .withExitScenarios(exitScenarios)
    //   .withEntities(entityRefs)
    //   .withUtterance(utterance)
    //   .withContext({
    //     projectID: context.runtime.project?._id,
    //     workspaceID: context.runtime.project!.teamID,
    //   });
    // const parsedData = llmWrapper.exec();


    // TODO: exit scenarios, reprompt, etc


    return context;
  }
}
