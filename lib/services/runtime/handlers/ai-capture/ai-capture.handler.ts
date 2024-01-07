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
import { getExitScenerioPrompt, getExtractionPrompt, getRulesPrompt } from './ai-capture.prompt';
import { EntityCache } from './ai-capture.types';

const getRequiredEntities = (node: BaseNode.AICapture.Node, runtime: GeneralRuntime) => {
  const entityMap = Object.fromEntries((runtime.version?.prototype?.model.slots || []).map((slot) => [slot.key, slot]));
  return node.entities.map((entityID) => entityMap[entityID]);
};

const AICaptureHandler: HandlerFactory<BaseNode.AICapture.Node, void, GeneralRuntime> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_CAPTURE,
  handle: async (node, runtime, variables) => {
    const exitPath = (node.exitPath && node.elseId) || node.nextId || null;

    const requiredEntities = getRequiredEntities(node, runtime);

    let entityCache: EntityCache =
      runtime.storage.get(StorageType.AI_CAPTURE_ENTITY_CACHE) ??
      Object.fromEntries(requiredEntities.map((entity) => [entity.name, null]));

    const evaluateRules = async () => {
      const result = await fetchRuntimeChat({
        resource: 'AI Capture Rules & Response',
        params: {
          messages: [{ role: BaseUtils.ai.Role.USER, content: getRulesPrompt(node.rules, entityCache) }],
          model: node.model,
          system: node.system,
        },
        runtime,
      });

      if (result.output === '1') {
        return node.nextId ?? null;
      }

      if (result.output) {
        addOutputTrace(
          runtime,
          getOutputTrace({
            output: generateOutput(result.output, runtime.project),
            version: runtime.version,
            ai: true,
          })
        );
      }

      return node.id;
    };

    const evaluateExitScenerio = async (utterance: string): Promise<boolean> => {
      if (!node.exitScenerios?.length) return false;

      const result = await fetchRuntimeChat({
        resource: 'AI Capture Exit Scenerio',
        params: {
          messages: [
            ...getMemoryMessages(runtime.variables.getState()),
            {
              role: BaseUtils.ai.Role.USER,
              content: getExitScenerioPrompt(utterance, node.exitScenerios, entityCache),
            },
          ],
          model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo,
        },
        runtime,
      });

      if (result.output === '0') {
        return true;
      }
      return false;
    };

    if (runtime.getAction() === Action.RUNNING) {
      addNoReplyTimeoutIfExists(node, runtime);

      // clean up no-matches and no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);
      runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);

      return evaluateRules();
    }

    const utterance = AIAssist.getInput(runtime.getRequest());

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
                      ...(type && type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
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
        entityCache = {
          ...entityCache,
          ...JSON.parse(result.output),
        };
        runtime.storage.set(StorageType.AI_CAPTURE_ENTITY_CACHE, entityCache);
      }

      // if nothing in entity cache is null
      if (Object.values(entityCache).every((entity) => entity !== null)) {
        variables.merge(Object.fromEntries(requiredEntities.map((entity) => [entity.name, entityCache[entity.name]])));

        runtime.storage.delete(StorageType.AI_CAPTURE_ENTITY_CACHE);
        return node.nextId ?? null;
      }

      if (await evaluateExitScenerio(utterance)) {
        return exitPath;
      }

      return evaluateRules();
    }

    const isLocalScope = node.intentScope === BaseNode.Utils.IntentScope.NODE;

    // check if there is a command in the stack that fulfills request
    if (!isLocalScope && CommandHandler().canHandle(runtime)) {
      return CommandHandler().handle(runtime, variables);
    }

    return exitPath;
  },
});

export default AICaptureHandler;
