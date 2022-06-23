/**
 * [[include:runtime.md]]
 * @packageDocumentation
 */

import { BaseNode } from '@voiceflow/base-types';

import Client, { Action as RuntimeAction, Runtime } from '@/runtime';
import { Config, Context, ContextHandler } from '@/types';

import { FullServiceMap } from '../index';
import CacheDataAPI from '../state/cacheDataAPI';
import { AbstractManager, injectServices } from '../utils';
import Handlers from './handlers';
import init from './init';
import { isActionRequest, isIntentRequest, isRuntimeRequest, TurnType, Variables } from './types';
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

  createClient(api: CacheDataAPI) {
    const client = new this.services.utils.Client({
      api,
      services: this.services,
      handlers: this.handlers,
    });

    init(client);

    return client;
  }

  public async handle({ versionID, userID, state, request, ...context }: Context): Promise<Context> {
    if (!isRuntimeRequest(request)) throw new Error(`invalid runtime request type: ${JSON.stringify(request)}`);

    const runtime = this.getRuntimeForContext({ versionID, userID, state, request, ...context });

    if (context.maxLogLevel) {
      // Update the max log level if possible
      // The types say that context.maxLogLevel can be undefined but in practice that should never happen

      runtime.debugLogging.maxLogLevel = context.maxLogLevel;
    }

    if (isIntentRequest(request)) {
      const confidence = getReadableConfidence(request.payload.confidence);

      runtime.trace.debug(
        `matched intent **${request.payload.intent.name}** - confidence interval _${confidence}%_`,
        BaseNode.NodeType.INTENT
      );

      runtime.variables.set(Variables.INTENT_CONFIDENCE, Number(confidence));

      if (request.payload.query) {
        runtime.variables.set(Variables.LAST_UTTERANCE, request.payload.query);
      }
    }

    if (context.data.config?.stopTypes) {
      runtime.turn.set(TurnType.STOP_TYPES, context.data.config.stopTypes);
    }

    if (context.data.config?.stopAll) {
      runtime.turn.set(TurnType.STOP_ALL, true);
    }

    runtime.variables.set(Variables.TIMESTAMP, Math.floor(Date.now() / 1000));

    // if state API call, set the variable user_id to be userID in the param
    if (userID) {
      runtime.variables.set(Variables.USER_ID, userID);
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
      versionID,
      state: runtime.getFinalState(),
      trace: runtime.trace.get(),
    };
  }

  private getRuntimeForContext(context: Context): Runtime {
    return this.createClient(context.data.api).createRuntime(context.versionID, context.state, context.request);
  }
}

export default RuntimeManager;
