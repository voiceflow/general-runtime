import { Request } from '@voiceflow/base-types';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State, TurnBuilder } from '@/runtime';
import { Context } from '@/types';

import { AbstractManager } from './utils';

class Interact extends AbstractManager {
  async state(data: { headers: { authorization?: string; origin?: string; version: string } }) {
    const api = await this.services.dataAPI.get(data.headers.authorization);
    const version = await api.getVersion(data.headers.version);
    return this.services.state.generate(version);
  }

  async handler(req: {
    params: { userID?: string };
    body: { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: Request.RequestConfig };
    query: { locale?: string };
    headers: { authorization?: string; origin?: string; sessionid?: string; version: string };
  }) {
    const { analytics, runtime, metrics, nlu, tts, dialog, asr, speak, slots, state: stateManager, filter } = this.services;

    const {
      body: { action = null, state, config = {} },
      params: { userID },
      query: { locale },
      headers: { version: versionID, authorization, origin, sessionid },
    } = req;

    let {
      body: { request = null },
    } = req;
    // `request` prop is deprecated, replaced with `action`
    // Internally the name request is still used
    request = action ?? request;

    if (request?.type === Request.RequestType.LAUNCH && state) {
      state.stack = [];
      state.storage = {};
      request = null;
    }

    metrics.generalRequest();
    if (authorization?.startsWith('VF.')) {
      metrics.sdkRequest();
    }

    const turn = new TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, slots, dialog, runtime);
    turn.addHandlers(analytics);

    if (config.tts) {
      turn.addHandlers(tts);
    }

    turn.addHandlers(speak, filter);

    return turn.resolve({
      state,
      request,
      userID,
      versionID,
      data: { locale, config, reqHeaders: { authorization, origin, sessionid } },
    });
  }
}

export default Interact;
