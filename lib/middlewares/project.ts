import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Request, Response } from 'express';

import { validate } from '@/lib/utils';

import { AbstractMiddleware } from './utils';

const { param, header } = Validator;
const VALIDATIONS = {
  PARAMS: {
    VERSION_ID: param('versionID')
      .exists()
      .isString(),
  },
  HEADERS: {
    AUTHORIZATION: header('authorization')
      .exists()
      .isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  @validate({ PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID, HEADERS_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION })
  async attachID(req: Request<{ versionID: string }>, _res: Response, next: NextFunction) {
    const api = await this.services.dataAPI.get(req.headers.authorization);
    try {
      const version = await api.getVersion(req.params.versionID);
      req.headers.projectID = version.projectID;
      return next();
    } catch (err) {
      throw new VError('no permissions for this version');
    }
  }
}

export default Project;
