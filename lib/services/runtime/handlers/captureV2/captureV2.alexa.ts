/**
 * Alexa captureV2 needs to be used in favor of general captureV2 because
 * it uses different command handler
 * it uses different EntityFillingNoMatch handler (response should never be elicit)
 */
import { VoiceModels } from '@voiceflow/voice-types';
import { VoiceflowConstants, VoiceflowNode, VoiceflowVersion } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { fillStringEntities, getUnfulfilledEntity } from '@/lib/services/dialog/utils';
import { HandlerFactory, Runtime, Store } from '@/runtime';

import { addOutputTrace, getOutputTrace } from '../../utils';
import { CommandAlexaHandler } from '../command/command.alexa';
import { EntityFillingNoMatchAlexaHandler } from '../utils/entity';
import { inputToString } from '../utils/output';
import { CaptureV2Handler, utilsObj } from './captureV2';

const addPromptIfExists = (node: VoiceflowNode.CaptureV2.Node, runtime: Runtime, variables: Store) => {
  if (!runtime.version?.prototype?.model) return;
  const request = runtime.getRequest();
  const intentRequest = {
    ...request,
    payload: {
      entities: [], // make sure we set entities to empty array if request is null
      ...request?.payload,
      intent: { ...request?.payload?.intent, name: node.intent?.name },
    },
  };
  const unfulfilledEntity = getUnfulfilledEntity(intentRequest, runtime.version.prototype.model);
  if (!unfulfilledEntity) return;

  const prompt = _.sample(unfulfilledEntity.dialog.prompt) as VoiceModels.IntentPrompt<VoiceflowConstants.Voice>;
  if (!prompt) return;

  const output = fillStringEntities(
    intentRequest,
    inputToString(prompt, (runtime.version as VoiceflowVersion.VoiceVersion).platformData.settings.defaultVoice)
  );
  addOutputTrace(
    runtime,
    getOutputTrace({
      output,
      version: runtime.version,
      variables,
      isPrompt: true,
    }),
    { node }
  );
};

const utils = {
  ...utilsObj,
  commandHandler: CommandAlexaHandler(),
  entityFillingNoMatchHandler: EntityFillingNoMatchAlexaHandler(),
  addPromptIfExists,
};

export const CaptureV2AlexaHandler: HandlerFactory<VoiceflowNode.CaptureV2.Node, typeof utils> = (handlerUtils) => {
  const { handle, canHandle } = CaptureV2Handler(handlerUtils);
  return {
    handle,
    canHandle: (node, ...args) => node.platform === VoiceflowConstants.PlatformType.ALEXA && canHandle(node, ...args),
  };
};

export default () => CaptureV2AlexaHandler(utils);
