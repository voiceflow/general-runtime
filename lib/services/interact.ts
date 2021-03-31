import { Config, RequestType } from '@voiceflow/general-types';
import { State, TurnBuilder } from '@voiceflow/runtime';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { Context } from '@/types';

import { AbstractManager } from './utils';

class Interact extends AbstractManager {
  async state(data: { headers: { authorization?: string; origin?: string }; params: { versionID: string } }) {
    const api = await this.services.dataAPI.get(data.headers.authorization);
    const version = await api.getVersion(data.params.versionID);
    return this.services.state.generate(version);
  }

  async handler(req: {
    params: { versionID: string };
    body: { state?: State; request?: RuntimeRequest; config?: Config };
    query: { locale?: string };
    headers: { authorization?: string; origin?: string };
  }) {
    const { runtime, metrics, nlu, tts, chips, dialog, asr, speak, slots, state: stateManager, filter } = this.services;

    const {
      body: { state, request = null, config = {} },
      params: { versionID },
      query: { locale },
      headers: { authorization, origin },
    } = req;

    const isLaunchRequest = request?.type === RequestType.LAUNCH;
    if (isLaunchRequest && state) {
      state.stack = [];
      state.storage = {};
    }

    metrics.generalRequest();
    if (authorization?.startsWith('VF.')) {
      metrics.sdkRequest();
    }

    const turn = new TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, slots, dialog, runtime);

    if (_.isUndefined(config.tts) || config.tts) {
      turn.addHandlers(tts);
    }

    turn.addHandlers(speak, chips, filter);

    return turn.resolve({
      state,
      request: isLaunchRequest ? request : null,
      versionID,
      data: { locale, config, reqHeaders: { authorization, origin } },
    });
  }
}

export default Interact;
