/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable max-depth */
/* eslint-disable sonarjs/cognitive-complexity */
import { BaseNode, BaseUtils } from '@voiceflow/base-types';

import AIAssist from '@/lib/services/aiAssist';
import { Action, HandlerFactory } from '@/runtime';

import type { GeneralRuntime } from '../../types';
import { StorageType } from '../../types';
import { addOutputTrace, getOutputTrace } from '../../utils';
import CommandHandler from '../command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from '../noReply';
import { fetchChat, getMemoryMessages } from '../utils/ai';
import { generateOutput } from '../utils/output';
import {
  getCaptureSystemPrompt,
  getCaptureUserPrompt,
  getEntityProcessingSystemPrompt,
  getEntityProcessingUserPrompt,
  getExtractionPrompt,
  getExtractionSystemPrompt,
} from './ai-capture.prompt';
import { EntityCache } from './ai-capture.types';

const getRequiredEntities = (node: BaseNode.AICapture.Node, runtime: GeneralRuntime) => {
  const entityMap = Object.fromEntries((runtime.version?.prototype?.model.slots || []).map((slot) => [slot.key, slot]));
  return node.entities.map((entityID) => entityMap[entityID]);
};
function parseOutput(input: string | null): ParsedData {
  const data: ParsedData = {
    Type: '',
    EntityState: null,
    Rationale: '',
    Response: '',
  };
  if (input === null) {
    return data;
  }
  const lines = input.split(/\n+/); // Assuming each section is separated by a double newline
  lines.forEach((line) => {
    if (line.startsWith('Type:')) {
      data.Type = line.substring('Type: '.length);
    } else if (line.startsWith('Entity State:')) {
      // Assuming Entity State is JSON-like but using single quotes
      const entityStateJson = line.substring('Entity State: '.length).replace(/'/g, '"').replace(/null/g, 'null');
      try {
        data.EntityState = JSON.parse(entityStateJson);
      } catch (error) {
        data.EntityState = null;
      }
    } else if (line.startsWith('Rationale:')) {
      data.Rationale = line.substring('Rationale: '.length);
    } else if (line.startsWith('Response:')) {
      data.Response = line.substring('Response: '.length);
    } else {
      data.Response = line;
    }
  });

  return data;
}

function separateDialogues(utterance: string, dialogues: BaseUtils.ai.Message[]): [string[], string[]] {
  let userContents: string[] = dialogues
    .filter((dialogue) => dialogue.role === 'user')
    .map((dialogue) => dialogue.content);
  const entriesToRemove: Set<string> = new Set(['1. Extract and Capture', '2. Single Prompt']);
  const assistantEntriesToRemove: Set<string> = new Set(['Please provide your name and company']);
  userContents = userContents.filter((userContent) => !entriesToRemove.has(userContent));
  userContents = userContents.filter((userContent) => !userContent.includes(utterance));

  let assistantContents: string[] = dialogues
    .filter((dialogue) => dialogue.role === 'assistant')
    .map((dialogue) => dialogue.content);
  assistantContents = assistantContents.filter((assistantContent) => !assistantEntriesToRemove.has(assistantContent));
  return [userContents, assistantContents];
}
interface ParsedData {
  Type: string;
  EntityState: any; // Use 'any' for simplicity; consider defining a more specific type
  Rationale: string;
  Response: string;
}

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

const AICaptureHandler: HandlerFactory<BaseNode.AICapture.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_CAPTURE,
  handle: async (node, runtime, variables) => {
    const entityProcessingType = variables.get('entity_processing_type') || 'single_prompt';
    // determine exit path
    const exitPath = (node.exitPath && node.elseId) || node.nextId || null;
    // required entities to be filled - fetch this from runtime
    const requiredEntities = getRequiredEntities(node, runtime);
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
    const isLocalScope = node.intentScope === BaseNode.Utils.IntentScope.NODE;
    if (entityProcessingType === 'extract_and_capture') {
      if (utterance) {
        if (NoReplyHandler().canHandle(runtime)) {
          return NoReplyHandler().handle(node, runtime, variables);
        }

        // capture entities
        const result = await fetchChat(
          {
            messages: [
              {
                role: BaseUtils.ai.Role.SYSTEM,
                content: getExtractionSystemPrompt(
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
            model: node.model,
            system: node.system,
            temperature: node.temperature,
            maxTokens: node.maxTokens,
          },
          runtime.services.mlGateway,
          {
            context: {
              projectID: runtime.project?._id,
              workspaceID: runtime.project!.teamID,
            },
          },
          variables.getState()
        );
        if (result.output) {
          const out = extractBracedStrings(result.output)[0];
          const resultEntities = JSON.parse(out);
          // if no new entities are captured, try to resolve an intent
          if (!Object.values(resultEntities).some(Boolean) && !isLocalScope && CommandHandler().canHandle(runtime)) {
            return CommandHandler().handle(runtime, variables);
          }

          entityCache = Object.fromEntries(
            requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
          );

          runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);

          // if there are no null values in the entity cache, we can proceed to the next node
          if (Object.values(entityCache).every(Boolean)) {
            variables.merge(
              Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]]))
            );
            runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
            return node.nextId || null;
          }
        }
        // we still need to process the entities captured for exit scenarios.
        const captureResult = await fetchChat(
          {
            messages: [
              {
                role: BaseUtils.ai.Role.SYSTEM,
                content: getCaptureSystemPrompt(
                  getMemoryMessages(runtime.variables.getState()),
                  node.rules,
                  node.exitScenerios,
                  entityCache
                ),
              },
              {
                role: BaseUtils.ai.Role.USER,
                content: getCaptureUserPrompt(
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
          runtime.services.mlGateway,
          {
            context: {
              projectID: runtime.project?._id,
              workspaceID: runtime.project!.teamID,
            },
          },
          variables.getState()
        );

        // const capture = JSON.parse(captureResult.output?.trim() || '') as { Type?: string; Response?: string };

        const parsedOut: ParsedData = parseOutput(captureResult.output);
        if (parsedOut.Type.includes('exit')) {
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return exitPath;
        }
        if (parsedOut.Type === 'reprompt') {
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
    if (entityProcessingType === 'single_prompt') {
      if (utterance) {
        if (NoReplyHandler().canHandle(runtime)) {
          return NoReplyHandler().handle(node, runtime, variables);
        }
        const messages = getMemoryMessages(runtime.variables.getState());
        // Separate the dialogues and store in respective variables
        const [prevUserStatements, prevResponses] = separateDialogues(utterance, messages);
        // capture entities
        const result = await fetchChat(
          {
            messages: [
              {
                role: BaseUtils.ai.Role.SYSTEM,
                content: getEntityProcessingSystemPrompt(
                  utterance,
                  prevUserStatements,
                  prevResponses,
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
              {
                role: BaseUtils.ai.Role.USER,
                content: getEntityProcessingUserPrompt(
                  utterance,
                  prevUserStatements,
                  prevResponses,
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
            model: node.model,
            system: node.system,
            temperature: node.temperature,
            maxTokens: node.maxTokens,
          },
          runtime.services.mlGateway,
          {
            context: {
              projectID: runtime.project?._id,
              workspaceID: runtime.project!.teamID,
            },
          },
          variables.getState()
        );

        const { output } = result;
        const parsedOut: ParsedData = parseOutput(output);
        const resultEntities = parsedOut.EntityState;
        if (resultEntities) {
          // if no new entities are captured, try to resolve an intent
          if (!Object.values(resultEntities).some(Boolean) && !isLocalScope && CommandHandler().canHandle(runtime)) {
            return CommandHandler().handle(runtime, variables);
          }

          entityCache = Object.fromEntries(
            requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
          );
          runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);
        }
        // Check for exit first

        if (parsedOut.Type.includes('exit')) {
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return exitPath;
        }
        // if not exit, check for type = fulfilled or entityCache is complete.
        // if nothing in entity cache is null - parsedOut.Type === 'fulfilled'
        if (parsedOut.Type === 'fulfilled' || Object.values(entityCache).every(Boolean)) {
          variables.merge(
            Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]]))
          );
          runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
          return node.nextId ?? null;
        }
        // Finally check if type is reprompt.
        if (parsedOut.Type === 'reprompt') {
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
