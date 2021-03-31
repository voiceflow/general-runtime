import { Validator } from '@voiceflow/backend-utils';
import { State } from '@voiceflow/runtime';
import { Request } from 'express';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { UpdateSchema } from './requests';

const { body } = Validator;
const VALIDATIONS = {
  BODY: {
    UPDATE_SESSION: body().custom(customAJV(UpdateSchema)),
  },
};

class StateManagementController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  async interact(req: Request<{ versionID: string; userID: string }>) {
    return this.services.stateManagement.interact(req);
  }

  async get(req: Request<{ versionID: string; userID: string }>) {
    return this.services.session.getFromDb(req.params.versionID, req.params.userID);
  }

  @validate({ BODY_UPDATE_SESSION: VALIDATIONS.BODY.UPDATE_SESSION })
  async update(req: Request<{ versionID: string; userID: string }, null, { state: State }>) {
    await this.services.session.saveToDb(req.params.versionID, req.params.userID, req.body.state);
    return req.body.state;
  }

  async delete(req: Request<{ versionID: string; userID: string }>) {
    return this.services.session.deleteFromDb(req.params.versionID, req.params.userID);
  }

  async reset(req: Request<{ versionID: string; userID: string }>) {
    return this.services.stateManagement.reset(req);
  }
}

export default StateManagementController;
