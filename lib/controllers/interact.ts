import { GeneralRequest } from '@voiceflow/general-types';
import { State, TurnBuilder } from '@voiceflow/runtime';
import { Request } from 'express';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { params: { versionID: string } }) {
    return this.services.state.generate(req.params.versionID);
  }

  async handler(req: Request<{ versionID: string }, null, { state?: State; request?: GeneralRequest }>) {
    const { runtime, metrics, nlu, tts, dialog, asr, state: stateManager } = this.services;

    metrics.generalRequest();

    const {
      body: { state, request },
      params: { versionID },
    } = req;

    const turn = new TurnBuilder<GeneralRequest | null>(stateManager);
    turn.addHandlers(asr, nlu, dialog, runtime).addHandlers(tts);

    return turn.handle({ state, request, versionID });
  }
}

export default InteractController;
