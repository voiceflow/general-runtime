/* eslint-disable sonarjs/cognitive-complexity */
import { BaseNode, BaseUtils } from '@voiceflow/base-types';

import AIAssist from '@/lib/services/aiAssist';
import { Action, HandlerFactory } from '@/runtime';

import { GeneralRuntime, StorageType } from '../../types';
import { addOutputTrace, getOutputTrace } from '../../utils';
import CommandHandler from '../command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from '../noReply';
import { fetchRuntimeChat, getMemoryMessages } from '../utils/ai';
import { generateOutput } from '../utils/output';
import { getCapturePrompt, getExtractionPrompt, getExtractionSystemPrompt, getEntityProcessingSystemPrompt, getEntityProcessingUserPrompt} from './ai-capture.prompt';
import { EntityCache } from './ai-capture.types';
import { or } from 'mathjs';

const getRequiredEntities = (node: BaseNode.AICapture.Node, runtime: GeneralRuntime) => {
  const entityMap = Object.fromEntries((runtime.version?.prototype?.model.slots || []).map((slot) => [slot.key, slot]));
  return node.entities.map((entityID) => entityMap[entityID]);
};
function parseOutput(input: string | null): ParsedData {
  const data: ParsedData = {
    Type: '',
    EntityState: null,
    Rationale: '',
    Response: ''
};
  if(input === null){
    return data
  }
  let lines = input.split(/\n\n/); // Assuming each section is separated by a double newline
  if (lines.length > 1) {
    console.log("The output contains more than one item.");
  } else {
    console.log("The output contains one or no items.");
    lines = input.split(/\n/); // Assuming each section is separated by a single newline
  }
  lines.forEach(line => {
      if (line.startsWith('Type:')) {
          data.Type = line.substring('Type: '.length);
      } else if (line.startsWith('Entity State:')) {
          // Assuming Entity State is JSON-like but using single quotes
          const entityStateJson = line.substring('Entity State: '.length).replace(/'/g, '"').replace(/null/g, 'null');
          try {
              data.EntityState = JSON.parse(entityStateJson);
          } catch (error) {
              console.error('Error parsing Entity State JSON', error);
          }
      } else if (line.startsWith('Rationale:')) {
          data.Rationale = line.substring('Rationale: '.length);
      } else if (line.startsWith('Response:')) {
          data.Response = line.substring('Response: '.length);
      }
      else {
        data.Response = line
      }
  });

  return data;
}


function separateDialogues(utterance: string, dialogues: BaseUtils.ai.Message[]): [string[], string[]] {
  let userContents: string[]  = dialogues.filter(dialogue => dialogue.role === 'user').map(dialogue => dialogue.content);
  const entriesToRemove: string[] = ['1. Extract and Capture', '2. Single Prompt'];
  const assistantEntriesToRemove: string[] = ['Please provide your name and company']
  userContents = userContents.filter(userContent => !entriesToRemove.includes(userContent));
  userContents = userContents.filter(userContent => !userContent.includes(utterance));
  console.log('User Dialogues after removal:', userContents);
  let assistantContents: string[]  = dialogues.filter(dialogue => dialogue.role === 'assistant').map(dialogue => dialogue.content);
  assistantContents = assistantContents.filter(assistantContent => !assistantEntriesToRemove.includes(assistantContent));
  return [userContents, assistantContents];
}
interface ParsedData {
  Type: string;
  EntityState: any;  // Use 'any' for simplicity; consider defining a more specific type
  Rationale: string;
  Response: string;
}

const AICaptureHandler: HandlerFactory<BaseNode.AICapture.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_CAPTURE,
  handle: async (node, runtime, variables) => {
    console.log("variables : ",variables)
    const entityProcessingType = variables.get('entity_processing_type');
    if (entityProcessingType === 'extract_and_capture') {
      console.log("entityProcessingType",entityProcessingType)
      // determine exit path
      const exitPath = (node.exitPath && node.elseId) || node.nextId || null;
      // required entities to be filled - fetch this from runtime
      const requiredEntities = getRequiredEntities(node, runtime);
      console.log("requiredEntities : ",requiredEntities)
      //
      let entityCache: EntityCache =
        runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE) ??
        Object.fromEntries(requiredEntities.map((entity) => [entity.name, null]));

      if (runtime.getAction() === Action.RUNNING) {
        addNoReplyTimeoutIfExists(node, runtime);

        // clean up no-matches and no-replies counters on new interaction
        runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
        runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);
        runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);

        return node.id;
      }

      const utterance = AIAssist.getInput(runtime.getRequest());
      console.log("utterance : ",utterance)
      const isLocalScope = node.intentScope === BaseNode.Utils.IntentScope.NODE;

      if (utterance) {
        if (NoReplyHandler().canHandle(runtime)) {
          return NoReplyHandler().handle(node, runtime, variables);
        }

        // capture entities
        const result = await fetchRuntimeChat({
          resource: 'AI Capture Extraction',
          params: {
            messages: [
              {
                role: BaseUtils.ai.Role.SYSTEM,
                content: getExtractionSystemPrompt(),
              },
              { 
                role: BaseUtils.ai.Role.USER,
                content: getExtractionPrompt(
                  utterance,
                  node.rules,
                  Object.fromEntries(
                    requiredEntities.map(({ name, type: { value: type }, inputs }) => [
                      name,
                      {
                        ...(type &&
                          type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
                        ...(inputs.length > 0 && { examples: inputs }),
                      },
                    ])
                  )
                ),
              },
            ],
            model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
          },
          runtime,
        });
        console.log("extract result.output:",result.output)
        if (result.output) {
          const resultEntities = JSON.parse(result.output);
          console.log("resultEntities:",resultEntities)
          // if no new entities are captured, try to resolve an intent
          if (!Object.values(resultEntities).some(Boolean) && !isLocalScope && CommandHandler().canHandle(runtime)) {
            console.log("!Object.values(resultEntities).some(Boolean)",!Object.values(resultEntities).some(Boolean))
            console.log("!isLocalScope && CommandHandler().canHandle(runtime)",!isLocalScope && CommandHandler().canHandle(runtime))
            return CommandHandler().handle(runtime, variables);
          }

          entityCache = Object.fromEntries(
            requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
          );
          console.log("entityCache",entityCache)

          runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);
          console.log("runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE)",runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE))
        }
       
        const messages = getMemoryMessages(runtime.variables.getState())
        console.log("MSGS----",messages)
       
        const mapped_msgs =  messages.map(({ role, content }) => `${role}: ${content}`).join('\n')
        console.log("mapped_msgs",mapped_msgs)


        // if nothing in entity cache is null
        if (Object.values(entityCache).every(Boolean)) {
          variables.merge(
            Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]]))
          );
          console.log("variables",variables)
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return node.nextId ?? null;
        }

        const captureResult = await fetchRuntimeChat({
          resource: 'AI Capture Rules & Response',
          params: {
            messages: [
              {
                role: BaseUtils.ai.Role.USER,
                content: getCapturePrompt(
                  getMemoryMessages(runtime.variables.getState()),
                  node.rules,
                  node.exitScenerios,
                  entityCache
                ),
              },
            ],
            model: node.model,
            system: node.system,
            temperature: node.temperature,
            maxTokens: node.maxTokens,
          },
          runtime,
        });

        const capture = JSON.parse(captureResult.output?.trim() || '') as { prompt?: string; exit?: number };
        if (capture.exit) {
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return exitPath;
        }
        if (capture.prompt) {
          addOutputTrace(
            runtime,
            getOutputTrace({
              output: generateOutput(capture.prompt, runtime.project),
              version: runtime.version,
              ai: true,
            }),
            { variables }
          );
        }
        return node.id;
      }

      // check if there is a command in the stack that fulfills request
      if (!isLocalScope && CommandHandler().canHandle(runtime)) {
        return CommandHandler().handle(runtime, variables);
      }

      return exitPath;
    }
    else {
      console.log("entityProcessingType",entityProcessingType)

      // determine exit path
      const exitPath = (node.exitPath && node.elseId) || node.nextId || null;
      // required entities to be filled - fetch this from runtime
      const requiredEntities = getRequiredEntities(node, runtime);
      console.log("requiredEntities : ",requiredEntities)
      //
      let entityCache: EntityCache =
        runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE) ??
        Object.fromEntries(requiredEntities.map((entity) => [entity.name, null]));

      if (runtime.getAction() === Action.RUNNING) {
        addNoReplyTimeoutIfExists(node, runtime);

        // clean up no-matches and no-replies counters on new interaction
        runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
        runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);
        runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);

        return node.id;
      }

      const utterance = AIAssist.getInput(runtime.getRequest());
      console.log("utterance : ",utterance)
      const isLocalScope = node.intentScope === BaseNode.Utils.IntentScope.NODE;

      if (utterance) {
        if (NoReplyHandler().canHandle(runtime)) {
          return NoReplyHandler().handle(node, runtime, variables);
        }
        const messages = getMemoryMessages(runtime.variables.getState())
        console.log("MSGS----",messages)
        // Separate the dialogues and store in respective variables
        let [userDialogues, assistantDialogues] = separateDialogues(utterance, messages);
        console.log('User Dialogues:', userDialogues);
        console.log('Assistant Dialogues:', assistantDialogues);
        // capture entities
        const result = await fetchRuntimeChat({
          resource: 'AI Capture Extraction Single Prompt',
          params: {
            messages: [
              {
                role: BaseUtils.ai.Role.SYSTEM,
                content: getEntityProcessingSystemPrompt(utterance,userDialogues,assistantDialogues,node.rules,node.exitScenerios,Object.fromEntries(
                  requiredEntities.map(({ name, type: { value: type }, inputs }) => [
                    name,
                    {
                      ...(type &&
                        type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
                      ...(inputs.length > 0 && { examples: inputs }),
                    },
                  ])
                )),
              },
              { 
                role: BaseUtils.ai.Role.USER,
                content: getEntityProcessingUserPrompt(
                  utterance,
                  userDialogues,
                  assistantDialogues,
                  node.rules,
                  node.exitScenerios,
                  Object.fromEntries(
                    requiredEntities.map(({ name, type: { value: type }, inputs }) => [
                      name,
                      {
                        ...(type &&
                          type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
                        ...(inputs.length > 0 && { examples: inputs }),
                      },
                    ])
                  )
                ),
              },
            ],
            model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
          },
          runtime,
        });
        // console.log("single prompt - result:",result)
        console.log("single prompt - result.output:",result.output)
        let output: string | null = result.output
        let parsedOut:ParsedData = parseOutput(output)
        console.log("parsedOut",parsedOut);
        const resultEntities = parsedOut.EntityState;
        if (resultEntities) {
          console.log("resultEntities:",resultEntities)
          // if no new entities are captured, try to resolve an intent
          if (!Object.values(resultEntities).some(Boolean) && !isLocalScope && CommandHandler().canHandle(runtime)) {
            console.log("!Object.values(resultEntities).some(Boolean)",!Object.values(resultEntities).some(Boolean))
            console.log("!isLocalScope && CommandHandler().canHandle(runtime)",!isLocalScope && CommandHandler().canHandle(runtime))
            return CommandHandler().handle(runtime, variables);
          }

          entityCache = Object.fromEntries(
            requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
          );
          console.log("entityCache",entityCache)

          runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);
          console.log("runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE)",runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE))
          console.log("MESSAGES---", runtime.variables.getState())

        }

        // if nothing in entity cache is null - parsedOut.Type === 'fulfilled'
        if (Object.values(entityCache).every(Boolean)) {
          variables.merge(
            Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]]))
          );
          console.log("variables",variables)
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return node.nextId ?? null;
        }
        if (parsedOut.Type.includes("exit")) {
          console.log("The parsedOut.Type contains the substring 'exit'");
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return exitPath;
        } 
        if(parsedOut.Type === 'reprompt'){
          addOutputTrace(
            runtime,
            getOutputTrace({
              output: generateOutput(parsedOut.Response, runtime.project),
              version: runtime.version,
              ai: true,
            }),
            { variables }
          );
        }
        return node.id;
      }

      // check if there is a command in the stack that fulfills request
      if (!isLocalScope && CommandHandler().canHandle(runtime)) {
        return CommandHandler().handle(runtime, variables);
      }

      return exitPath;
    
    }
    return null;
  },
});

export default AICaptureHandler;
