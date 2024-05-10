/**
 * [[include:runtime.md]]
 * @packageDocumentation
 */

import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import Client, { Action as RuntimeAction, Runtime } from '@/runtime';
import { HandleContextEventHandler } from '@/runtime/lib/Context/types';
import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import CacheDataAPI from '../state/cacheDataAPI';
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
  private handlers: ReturnType<typeof Handlers>;

  constructor(services: FullServiceMap, config: Config) {
    super(services, config);
    this.handlers = this.services.utils.Handlers(config);
  }

  createClient(api: CacheDataAPI, eventHandler: HandleContextEventHandler) {
    const client = new this.services.utils.Client({
      api,
      services: this.services,
      handlers: this.handlers,
    });

    init(client, eventHandler);

    return client;
  }

  public async handle(
    { versionID, userID, state, request, ...context }: Context,
    eventHandler: HandleContextEventHandler
  ): Promise<Context> {
    if (!isRuntimeRequest(request)) throw new Error(`invalid runtime request type: ${JSON.stringify(request)}`);

    const runtime = this.getRuntimeForContext({ versionID, userID, state, request, ...context }, eventHandler);

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
      runtime.variables.set(VoiceflowConstants.BuiltInVariable.LAST_UTTERANCE, request.payload.label);
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
      await runtime.update();
    } else {
      runtime.setAction(RuntimeAction.END); // to get final state
    }

    return {
      ...context,
      request,
      userID,
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get(),
    };
  }

  private getRuntimeForContext(context: Context, eventHandler: HandleContextEventHandler): Runtime {
    if (context.request && BaseRequest.isLaunchRequest(context.request)) {
      context.request = null;
    }

    const runtime = this.createClient(context.data.api, eventHandler).createRuntime({
      versionID: context.versionID,
      state: context.state,
      request: context.request,
      version: context.version,
      project: context.project,
      plan: context.plan,
      subscriptionEntitlements: context.subscriptionEntitlements,
      timeout: Math.max(this.config.ERROR_RESPONSE_MS - 5000, 0),
    });

    runtime.debugLogging.refreshContext(context);

    // Import any traces already present in the context
    context.trace?.forEach((trace) => runtime.trace.addTrace(trace));

    return runtime;
  }
}

export default RuntimeManager;
