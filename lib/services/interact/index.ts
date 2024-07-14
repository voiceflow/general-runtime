import { BaseRequest, BaseTrace, RuntimeLogs } from '@voiceflow/base-types';
import { isEmpty, merge } from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { PartialContext, State, TurnBuilder } from '@/runtime';
import { HandleContextEventHandler } from '@/runtime/lib/Context/types';
import { Context } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import autoDelegate from './autoDelegate';
import { InteractRequest } from './interfaces/interact.interface';

export interface ResponseContext {
  request: RuntimeRequest;
  state: State;
  trace?: BaseTrace.AnyTrace[];
}

const utils = {
  autoDelegate,
  TurnBuilder,
};

@injectServices({ utils })
class Interact extends AbstractManager<{ utils: typeof utils }> {
  async state(versionID: string): Promise<State> {
    const api = await this.services.dataAPI.get();
    const version = await api.getVersion(versionID);
    return this.services.state.generate(version);
  }

  async interact(request: InteractRequest, eventHandler: HandleContextEventHandler): Promise<ResponseContext> {
    const {
      aiAssist,
      analytics,
      asr,
      dialog,
      extraction,
      filter,
      nlu,
      // reprompt,
      runtime,
      slots,
      speak,
      state: stateManager,
    } = this.services;

    const stateID = request.userID + request.sessionID;
    let storedState = await this.services.session.getFromDb<State>(request.projectID, stateID);
    if (isEmpty(storedState)) {
      storedState = await this.state(request.versionID);
    }

    const state = merge(storedState, request.state);

    const context: PartialContext<Context> = {
      data: {},
      state,
      userID: stateID,
      request: request.action,
      versionID: request.versionID,
      maxLogLevel: RuntimeLogs.LogLevel.OFF,
    };

    const turn = new this.services.utils.TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, aiAssist, slots, extraction, dialog, runtime);
    turn.addHandlers(analytics);
    turn.addHandlers(speak, filter);

    const result = await turn.resolve(this.services.utils.autoDelegate(turn, context, eventHandler));

    await this.services.session.saveToDb(request.projectID, stateID, result.state);

    return result;
  }

  async handler(req: {
    params: { userID?: string };
    body: {
      state?: State;
      action?: RuntimeRequest;
      request?: RuntimeRequest;
      config?: BaseRequest.RequestConfig;
    };
    query: { locale?: string; logs?: RuntimeLogs.LogLevel };
    headers: {
      authorization?: string;
      origin?: string;
      sessionid?: string;
      versionID: string;
      platform?: string;
    };
  }): Promise<ResponseContext> {
    const {
      analytics,
      runtime,
      metrics,
      nlu,
      tts,
      dialog,
      extraction,
      asr,
      speak,
      slots,
      state: stateManager,
      filter,
      aiAssist,
      mergeCompletion,
    } = this.services;

    const {
      // `request` prop is deprecated, replaced with `action`
      // Internally the name request is still used
      body: { state, config = {}, action = null, request = null },
      params: { userID },
      query: { locale, logs: maxLogLevel },
      headers: { authorization, versionID, origin, sessionid, platform },
    } = req;

    metrics.generalRequest();
    if (authorization?.startsWith('VF.')) metrics.sdkRequest();

    const context: PartialContext<Context> = {
      data: {
        locale,
        config,
        reqHeaders: { authorization, origin, sessionid, platform },
      },
      state,
      userID,
      request: action ?? request,
      versionID,
      maxLogLevel: maxLogLevel ?? RuntimeLogs.LogLevel.OFF,
    };

    const turn = new this.services.utils.TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, aiAssist, slots, extraction, dialog, runtime, mergeCompletion);
    turn.addHandlers(analytics);

    if (config.tts) {
      turn.addHandlers(tts);
    }

    turn.addHandlers(speak, filter);

    if (config.selfDelegate) {
      return turn.resolve(turn.handle(context, () => undefined));
    }

    return turn.resolve(this.services.utils.autoDelegate(turn, context, () => undefined));
  }
}

export default Interact;
