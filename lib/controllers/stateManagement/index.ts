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
    PROJECT: header('project')
      .exists()
      .isString(),
    VERSION: header('version')
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
    HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT,
    HEADERS_VERSION: VALIDATIONS.HEADERS.VERSION,
    QUERY_VERBOSE: VALIDATIONS.QUERY.VERBOSE,
  })
  async interact(req: Request<{ userID: string }, any, { project: string; authorization: string; version: string }, { verbose?: boolean }>) {
    return this.services.stateManagement.interact(req);
  }

  @validate({ HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT })
  async get(req: Request<{ userID: string }, any, { project: string }>) {
    return this.services.session.getFromDb(req.headers.project, req.params.userID);
  }

  @validate({ BODY_UPDATE_SESSION: VALIDATIONS.BODY.UPDATE_SESSION, HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT })
  async update(req: Request<{ userID: string }, State, { project: string }>) {
    await this.services.session.saveToDb(req.headers.project, req.params.userID, req.body);
    return req.body;
  }

  @validate({ HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT })
  async delete(req: Request<{ userID: string }, any, { project: string }>) {
    return this.services.session.deleteFromDb(req.headers.project, req.params.userID);
  }

  @validate({ HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT, HEADERS_VERSION: VALIDATIONS.HEADERS.VERSION })
  async reset(req: Request<{ userID: string }, any, { project: string; authorization: string; version: string }>) {
    return this.services.stateManagement.reset(req);
  }

  @validate({ BODY_UPDATE_VARIABLES: VALIDATIONS.BODY.OBJECT, HEADERS_PROJECT: VALIDATIONS.HEADERS.PROJECT })
  async updateVariables(req: Request<{ userID: string }, Record<string, any>, { project: string }>) {
    const state = await this.services.session.getFromDb<State>(req.headers.project, req.params.userID);

    const newState = {
      ...state,
      variables: { ...state.variables, ...req.body },
    };

    await this.services.session.saveToDb(req.headers.project, req.params.userID, newState);

    return newState;
  }
}

export default StateManagementController;
