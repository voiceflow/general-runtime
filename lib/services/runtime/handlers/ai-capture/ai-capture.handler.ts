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
import { getCapturePrompt, getExtractionPrompt } from './ai-capture.prompt';
import { EntityCache } from './ai-capture.types';

const getRequiredEntities = (node: BaseNode.AICapture.Node, runtime: GeneralRuntime) => {
  const entityMap = Object.fromEntries((runtime.version?.prototype?.model.slots || []).map((slot) => [slot.key, slot]));
  return node.entities.map((entityID) => entityMap[entityID]);
};
/* eslint max-depth: ["error", 5] */
const AICaptureHandler: HandlerFactory<BaseNode.AICapture.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_CAPTURE,
  handle: async (node, runtime, variables) => {
    // console.log("variables : ",variables)
    const entityProcessingType = variables.get('entity_processing_type');
    if (entityProcessingType === 'extract_and_capture') {
      // console.log("entityProcessingType",entityProcessingType)
      // determine exit path
      const exitPath = (node.exitPath && node.elseId) || node.nextId || null;
      // required entities to be filled - fetch this from runtime
      const requiredEntities = getRequiredEntities(node, runtime);
      // console.log("requiredEntities : ",requiredEntities)
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

        if (result.output) {
          const resultEntities = JSON.parse(result.output);

          // if no new entities are captured, try to resolve an intent
          if (!Object.values(resultEntities).some(Boolean) && !isLocalScope && CommandHandler().canHandle(runtime)) {
            return CommandHandler().handle(runtime, variables);
          }

          entityCache = Object.fromEntries(
            requiredEntities.map(({ name }) => [name, resultEntities[name] || entityCache[name] || null])
          );

          runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);
        }

        // if nothing in entity cache is null
        if (Object.values(entityCache).every(Boolean)) {
          variables.merge(
            Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]]))
          );

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

    // console.log("entityProcessingType",entityProcessingType)
    return null;

    return null;
  },
});

export default AICaptureHandler;
