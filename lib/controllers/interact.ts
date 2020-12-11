import { StateRequest } from '@voiceflow/general-types';
import { State } from '@voiceflow/runtime';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async context(req: { params: { versionID: string } }) {
    return this.services.state.generate(req.params.versionID);
  }

  async handler(req: { body: { state: State; request?: StateRequest } }) {
    const { runtime, metrics } = this.services;

    metrics.prototypeRequest();

    return runtime.invoke(req.body.state, req.body.request);
  }
}

export default InteractController;
