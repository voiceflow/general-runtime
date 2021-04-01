import { Validator } from '@voiceflow/backend-utils';
import { State } from '@voiceflow/runtime';

import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { UpdateSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    UPDATE_SESSION: body().custom(customAJV(UpdateSchema)),
  },
  HEADERS: {
    PROJECT_ID: header('projectID')
      .exists()
      .isString(),
  },
};

class StateManagementController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async interact(req: Request<{ userID: string; versionID: string }, any, { projectID: string; authorization: string }>) {
    return this.services.stateManagement.interact(req);
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async get(req: Request<{ userID: string; versionID: string }, any, { projectID: string }>) {
    return this.services.session.getFromDb(req.headers.projectID, req.params.userID);
  }

  @validate({ BODY_UPDATE_SESSION: VALIDATIONS.BODY.UPDATE_SESSION, HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async update(req: Request<{ versionID: string; userID: string }, { state: State }, { projectID: string }>) {
    await this.services.session.saveToDb(req.headers.projectID, req.params.userID, req.body.state);
    return req.body.state;
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async delete(req: Request<{ userID: string; versionID: string }, any, { projectID: string }>) {
    return this.services.session.deleteFromDb(req.headers.projectID, req.params.userID);
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async reset(req: Request<{ userID: string; versionID: string }, any, { projectID: string; authorization: string }>) {
    return this.services.stateManagement.reset(req);
  }
}

export default StateManagementController;
