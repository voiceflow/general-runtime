import { BaseUtils } from '@voiceflow/base-types';
import { CaptureV3Node, CaptureV3NodeDTO, isIntentRequest } from '@voiceflow/dtos';

import AIAssist from '@/lib/services/aiAssist';
import { Context, ContextHandler } from '@/types';

import { shouldDoLLMExtraction } from '../nlu/utils';
import { fetchChat } from '../runtime/handlers/utils/ai';
import { GeneralRuntime, StorageType } from '../runtime/types';
import { AbstractManager } from '../utils';
import { getExtractionPrompt, getExtractionSystemPrompt } from './ai-capture.prompt';
import { EntityCache } from './ai-capture.types';

// const mocks = {
//   node: {},
//   intentRequest: {},
// };

const getRequiredEntities = (node: CaptureV3Node, runtime: GeneralRuntime) => {
  if (node.data.capture.type !== 'entity') {
    return [];
  }
  const entityMap = Object.fromEntries((runtime.version?.prototype?.model.slots || []).map((slot) => [slot.key, slot]));
  return node.data.capture.items.map(({ entityID }) => entityMap[entityID]);
};

function extractBracedStrings(input: string): string[] {
  const regex = /({[^}]*})/g;
  const results: string[] = [];

  // Extract matches using the regex pattern
  const matches: RegExpMatchArray | null = input.match(regex);

  if (matches) {
    results.push(...matches);
  }
  return results;
}

class Extraction extends AbstractManager implements ContextHandler {
  canHandle = async (context: Context): Promise<boolean> =>
    isIntentRequest(context.request) && !(await shouldDoLLMExtraction(context));

  handle = async (context: Context): Promise<Context> => {
    if (!(await this.canHandle(context))) {
      return context;
    }

    const currentFrame = context.runtime.stack.top();
    const program = await context.runtime.getProgram(context.runtime.getVersionID(), currentFrame.getDiagramID());
    const node = program.getNode(currentFrame.getNodeID());
    const { variables } = context.runtime;

    // const version = await context.data.api.getVersion(context.versionID);
    // const project = await context.data.api.getProject(version.projectID);

    const parsedNode = CaptureV3NodeDTO.safeParse(node);
    if (!parsedNode.success) {
      return context;
    }

    const { data } = parsedNode.data;
    if (data.capture.type !== 'entity') {
      return context;
    }

    // get rules/exit scenario
    const ruleTexts = (data.capture.automaticReprompt?.rules || []).map(({ text }) => text);

    // llm extract

    // required entities to be filled - fetch this from runtime
    const requiredEntities = getRequiredEntities(parsedNode.data, context.runtime);
    const utterance = AIAssist.getInput(context.runtime.getRequest());

    // TODO: what's the proper way to store at this level? see DM storage
    let entityCache: EntityCache =
      context.runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE) ??
      Object.fromEntries(requiredEntities.map((entity) => [entity.name, null]));

    if (!utterance) {
      // TODO
      return { ...context };
    }

    /**
     * NoReply stuff
     * if (NoReplyHandler().canHandle(context.runtime))
     *   // stuff
     */
    // capture entities
    const entityRefs = Object.fromEntries(
      requiredEntities.map(({ name, type: { value: type }, inputs }) => [
        name,
        {
          ...(type && type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
          ...(inputs.length > 0 && { examples: inputs }),
        },
      ])
    );
    const result = await fetchChat(
      // @ts-ignore
      {
        messages: [
          {
            role: BaseUtils.ai.Role.SYSTEM,
            content: getExtractionSystemPrompt(utterance, ruleTexts, entityRefs),
          },
          {
            role: BaseUtils.ai.Role.USER,
            content: getExtractionPrompt(utterance, ruleTexts, entityRefs),
          },
        ],
        ...data.capture.automaticReprompt?.params,
      },
      context.runtime.services.mlGateway,
      {
        context: {
          projectID: context.runtime.project?._id,
          workspaceID: context.runtime.project!.teamID,
        },
      },
      variables.getState()
    );

    if (!result.output) {
      return context;
    }

    // parse
    const out = extractBracedStrings(result.output)[0];
    const resultEntities = JSON.parse(out);

    // if no new entities are captured, passthrough
    if (!Object.values(resultEntities).some(Boolean)) {
      return context;
    }

    entityCache = Object.fromEntries(
      requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
    );

    context.runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);

    // TODO: not variables for this handler
    variables.merge(Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]])));
    context.runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);

    // TODO: context not nodes
    // return { ...context, request: newStuff };

    // if exitScenario -> create GoTo (exitPath) + autoDelegate

    return context;
  };
}

export default Extraction;
