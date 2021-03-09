/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { Config } from '@voiceflow/general-types';
import { State, TurnBuilder } from '@voiceflow/runtime';
import { Request } from 'express';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { Context } from '@/types';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string }; params: { versionID: string } }) {
    const api = await this.services.dataAPI.get(req.headers.authorization);
    const version = await api.getVersion(req.params.versionID);
    return this.services.state.generate(version);
  }

  async handler(req: Request<{ versionID: string }, null, { state?: State; request?: RuntimeRequest; config?: Config }, { locale?: string }>) {
    const { runtime, metrics, nlu, tts, chips, dialog, asr, speak, slots, state: stateManager, filter } = this.services;

    metrics.generalRequest();
    const {
      body: { state, request = null, config = {} },
      params: { versionID },
      query: { locale },
      headers: { authorization, origin },
    } = req;

    const turn = new TurnBuilder<Context>(stateManager);

    turn.addHandlers(asr, nlu, slots, dialog, runtime);

    if (_.isUndefined(config.tts) || config.tts) {
      turn.addHandlers(tts);
    }

    turn.addHandlers(speak, chips, filter);

    return turn.resolve({ state, request, versionID, data: { locale, config, reqHeaders: { authorization, origin } } });
  }
}

export default InteractController;
