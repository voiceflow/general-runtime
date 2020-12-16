import { State, TurnBuilder } from '@voiceflow/runtime';

import { ContextRequest } from '@/types';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { params: { versionID: string } }) {
    return this.services.state.generate(req.params.versionID);
  }

  async handler(req: { body: { state?: State; request?: ContextRequest }; params: { versionID: string } }) {
    const { runtime, metrics, nlu, tts, dialog, asr, state: stateManager } = this.services;

    metrics.prototypeRequest();

    const {
      body: { state, request },
      params: { versionID },
    } = req;

    const turn = new TurnBuilder<ContextRequest>(stateManager);
    turn.addHandlers(asr, nlu, dialog, runtime).addHandlers(tts);

    return turn.handle({ state, request, versionID });
  }
}

export default InteractController;
