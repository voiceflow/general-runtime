import { Validator } from '@voiceflow/backend-utils';
import { RuntimeLogs } from '@voiceflow/base-types';

import { SharedValidations } from '@/lib/validations';
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
    PROJECT_ID: header('projectID').exists().isString(),
    VERSION_ID: header('versionID').exists().isString(),
  },
  QUERY: {
    VERBOSE: query('verbose').isBoolean().optional().toBoolean(),
  },
};

class StateManagementController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    QUERY_VERBOSE: VALIDATIONS.QUERY.VERBOSE,
    QUERY_LOGS: SharedValidations.Runtime.QUERY.LOGS,
  })
  async interact(
    req: Request<
      { userID: string },
      any,
      { projectID: string; authorization: string; versionID: string },
      { verbose?: boolean; logs?: RuntimeLogs.LogLevel }
    >
  ) {
    return this.services.stateManagement.interact(req);
  }

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async publicInteract(req: Request<{ userID: string }, any, { projectID: string; versionID: string }>) {
    const {
      headers: { projectID, versionID },
      params: { userID },
      body: { action },
    } = req;

    // only pass in select properties to avoid any potential security issues
    return this.services.stateManagement.interact({
      headers: { projectID, versionID },
      params: { userID },
      body: { action },
      query: {},
    });
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async get(req: Request<{ userID: string }, any, { projectID: string }>) {
    return this.services.session.getFromDb(req.headers.projectID, req.params.userID);
  }

  @validate({
    BODY_UPDATE_SESSION: VALIDATIONS.BODY.UPDATE_SESSION,
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
  })
  async update(req: Request<{ userID: string }, State, { projectID: string }>) {
    await this.services.session.saveToDb(req.headers.projectID, req.params.userID, req.body);
    return req.body;
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async delete(req: Request<{ userID: string }, any, { projectID: string }>) {
    return this.services.session.deleteFromDb(req.headers.projectID, req.params.userID);
  }

  @validate({ HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID, HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID })
  async reset(req: Request<{ userID: string }, any, { projectID: string; authorization: string; versionID: string }>) {
    return this.services.stateManagement.reset(req);
  }

  @validate({ BODY_UPDATE_VARIABLES: VALIDATIONS.BODY.OBJECT, HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID })
  async updateVariables(req: Request<{ userID: string }, Record<string, any>, { projectID: string }>) {
    const state = await this.services.session.getFromDb<State>(req.headers.projectID, req.params.userID);

    const newState = {
      ...state,
      variables: { ...state.variables, ...req.body },
    };

    await this.services.session.saveToDb(req.headers.projectID, req.params.userID, newState);

    return newState;
  }
}

export default StateManagementController;
