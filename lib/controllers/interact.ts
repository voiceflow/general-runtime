/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { GeneralRequest } from '@voiceflow/general-types';
import { State, TurnBuilder } from '@voiceflow/runtime';
import { Request } from 'express';

import { Context } from '@/types';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { params: { versionID: string } }) {
    const version = await this.services.dataAPI.getVersion(req.params.versionID);
    return this.services.state.generate(version);
  }

  async handler(req: Request<{ versionID: string }, null, { state?: State; request?: GeneralRequest }, { locale?: string }>) {
    const { runtime, metrics, nlu, tts, chips, dialog, asr, state: stateManager } = this.services;

    metrics.generalRequest();

    const {
      body: { state, request = null },
      params: { versionID },
      query: { locale },
    } = req;

    const turn = new TurnBuilder<Context>(stateManager);
    turn.addHandlers(asr, nlu, dialog, runtime).addHandlers(tts, chips);

    return turn.resolve({ state, request, versionID, data: { locale } });
  }
}

export default InteractController;
