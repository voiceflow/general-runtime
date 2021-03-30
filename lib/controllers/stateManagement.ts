import { State } from '@voiceflow/runtime';
import { Request } from 'express';

import { AbstractController } from './utils';

class StateManagementController extends AbstractController {
  async interact(req: Request<{ versionID: string; userID: string }>) {
    return this.services.stateManagement.interact(req);
  }

  async get(req: Request<{ versionID: string; userID: string }>) {
    return this.services.session.getFromDb(req.params.userID);
  }

  async update(req: Request<{ versionID: string; userID: string }, null, { state: State }>) {
    return this.services.session.saveToDb(req.params.userID, req.body.state);
  }

  async reset(req: Request<{ versionID: string; userID: string }>) {
    return this.services.stateManagement.reset(req);
  }
}

export default StateManagementController;
