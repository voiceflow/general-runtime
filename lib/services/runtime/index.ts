/**
 * [[include:runtime.md]]
 * @packageDocumentation
 */

import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import Client, { Action as RuntimeAction } from '@/runtime';
import { HandleContextEventHandler } from '@/runtime/lib/Context/types';
import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import { AbstractManager, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';
import { isActionRequest, isIntentRequest, isPathRequest, isRuntimeRequest, TurnType } from './types';
import { getReadableConfidence } from './utils';

export const utils = {
  Client,
  Handlers,
};

@injectServices({ utils })
class RuntimeManager extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  constructor(services: FullServiceMap, config: Config) {
    super(services, config);
  }

  public async handle(
    { versionID, userID, state, request, runtime, client, ...context }: Context,
    eventHandler: HandleContextEventHandler
  ): Promise<Context> {
    if (!isRuntimeRequest(request)) throw new Error(`invalid runtime request type: ${JSON.stringify(request)}`);

    if (isIntentRequest(request)) {
      const confidence = getReadableConfidence(request.payload.confidence);

      runtime.trace.debug(
        `matched intent **${request.payload.intent.name}** - confidence interval _${confidence}%_`,
        BaseNode.NodeType.INTENT
      );

      runtime.variables.set(VoiceflowConstants.BuiltInVariable.INTENT_CONFIDENCE, Number(confidence));

      if (request.payload.query) {
        runtime.variables.set(VoiceflowConstants.BuiltInVariable.LAST_UTTERANCE, request.payload.query);
      }
    }

    if (isPathRequest(request)) {
      runtime.variables.set(VoiceflowConstants.BuiltInVariable.LAST_UTTERANCE, request.payload?.label);
    }

    runtime.variables.set(VoiceflowConstants.BuiltInVariable.LAST_EVENT, request);

    if (context.data.config?.stopTypes) {
      runtime.turn.set(TurnType.STOP_TYPES, context.data.config.stopTypes);
    }

    if (context.data.config?.stopAll) {
      runtime.turn.set(TurnType.STOP_ALL, true);
    }

    runtime.variables.set(VoiceflowConstants.BuiltInVariable.TIMESTAMP, Math.floor(Date.now() / 1000));

    // if state API call, set the variable user_id to be userID in the param
    if (userID) {
      runtime.variables.set(VoiceflowConstants.BuiltInVariable.USER_ID, userID);
    }

    // skip runtime for the action request, since it do not have any effects
    if (!isActionRequest(request)) {
      await runtime.update(eventHandler);
    } else {
      runtime.setAction(RuntimeAction.END); // to get final state
    }

    return {
      ...context,
      client: init(client, eventHandler),
      runtime,
      request,
      userID,
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get(),
    };
  }
}

export default RuntimeManager;
