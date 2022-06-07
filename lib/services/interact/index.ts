import { BaseRequest, BaseTrace } from '@voiceflow/base-types';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { PartialContext, State, TurnBuilder } from '@/runtime';
import { Context, PredictionStage } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import autoDelegate from './autoDelegate';

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
  async state(data: { headers: { authorization?: string; origin?: string; versionID: string } }): Promise<State> {
    const api = await this.services.dataAPI.get(data.headers.authorization);
    const version = await api.getVersion(data.headers.versionID);
    return this.services.state.generate(version);
  }

  async handler(req: {
    params: { userID?: string };
    body: { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig };
    query: { locale?: string };
    headers: { authorization?: string; origin?: string; sessionid?: string; versionID: string; platform?: string; stage: PredictionStage };
  }): Promise<ResponseContext> {
    const {
      analytics,
      runtime,
      metrics,
      nlu,
      tts,
      dialog,
      asr,
      speak,
      slots,
      state: stateManager,
      filter,
    } = this.services;

    const {
      // `request` prop is deprecated, replaced with `action`
      // Internally the name request is still used
      body: { state, config = {}, action = null, request = null },
      params: { userID },
      query: { locale },
      headers: { versionID, authorization, origin, sessionid, platform, stage },
    } = req;

    metrics.generalRequest();
    if (authorization?.startsWith('VF.')) metrics.sdkRequest();

    const context: PartialContext<Context> = {
      data: {
        locale,
        config,
        stage,
        reqHeaders: { authorization, origin, sessionid, platform },
      },
      state,
      userID,
      request: action ?? request,
      versionID,
    };

    const turn = new this.services.utils.TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, slots, dialog, runtime);
    turn.addHandlers(analytics);

    if (config.tts) {
      turn.addHandlers(tts);
    }

    turn.addHandlers(speak, filter);

    if (config.selfDelegate) {
      return turn.resolve(turn.handle(context));
    }

    return turn.resolve(this.services.utils.autoDelegate(turn, context));
  }
}

export default Interact;
