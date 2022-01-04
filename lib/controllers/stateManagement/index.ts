import { Validator } from '@voiceflow/backend-utils';

import { State } from '@/runtime';
import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { UpdateSchema } from './requests';

const { body, header, query } = Validator;
const VALIDATIONS = {
  BODY: {
    UPDATE_SESSION: body().custom(customAJV(UpdateSchema)),
    OBJECT: body().exists(),
  },
  HEADERS: {
    PROJECT_ID: header('projectid')
      .exists()
      .isString(),
    VERSION_ID: header('versionid')
      .exists()
      .isString(),
  },
  QUERY: {
    VERBOSE: query('verbose')
      .isBoolean()
      .optional()
      .toBoolean(),
  },
};

class StateManagementController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    QUERY_VERBOSE: VALIDATIONS.QUERY.VERBOSE,
  })
  async interact(req: Request<{ userID: string }, any, { projectid: string; authorization: string; versionid: string }, { verbose?: boolean }>) {
    return this.services.stateManagement.interact(req);
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async get(req: Request<{ userID: string }, any, { projectid: string }>) {
    return this.services.session.getFromDb(req.headers.projectid, req.params.userID);
  }

  @validate({ BODY_UPDATE_SESSION: VALIDATIONS.BODY.UPDATE_SESSION, HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async update(req: Request<{ userID: string }, State, { projectid: string }>) {
    await this.services.session.saveToDb(req.headers.projectid, req.params.userID, req.body);
    return req.body;
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async delete(req: Request<{ userID: string }, any, { projectid: string }>) {
    return this.services.session.deleteFromDb(req.headers.projectid, req.params.userID);
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID, HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID })
  async reset(req: Request<{ userID: string }, any, { projectid: string; authorization: string; versionid: string }>) {
    return this.services.stateManagement.reset(req);
  }

  @validate({ BODY_UPDATE_VARIABLES: VALIDATIONS.BODY.OBJECT, HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async updateVariables(req: Request<{ userID: string }, Record<string, any>, { projectid: string }>) {
    const state = await this.services.session.getFromDb<State>(req.headers.projectid, req.params.userID);

    const newState = {
      ...state,
      variables: { ...state.variables, ...req.body },
    };

    await this.services.session.saveToDb(req.headers.projectid, req.params.userID, newState);

    return newState;
  }
}

export default StateManagementController;
