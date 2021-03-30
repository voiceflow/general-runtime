import { State } from '@voiceflow/runtime';
import { Request } from 'express';

import { AbstractManager } from './utils';

class StateManagement extends AbstractManager {
  async interact(req: Request<{ versionID: string; userID: string }>) {
    let state = await this.services.session.getFromDb<State>(req.params.userID);
    if (!state) {
      state = await this.reset(req);
    }

    req.body.state = state;

    const { state: updatedState, trace } = await this.services.interact.handler(req);

    await this.services.session.saveToDb(req.params.userID, updatedState);

    return trace;
  }

  async reset(req: Request<{ versionID: string; userID: string }>) {
    const state = await this.services.interact.state(req);
    await this.services.session.saveToDb(req.params.userID, state);
    return state;
  }
}

export default StateManagement;
