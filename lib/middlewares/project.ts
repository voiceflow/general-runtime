import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Request, Response } from 'express';

import { validate } from '@/lib/utils';
import { CreatorDataApi } from '@/runtime';

import { AbstractMiddleware } from './utils';

const { param, header } = Validator;
const VALIDATIONS = {
  PARAMS: {
    VERSION_ID: param('versionID')
      .optional()
      .isString(),
  },
  HEADERS: {
    VERSION_ID: header('versionID')
      .optional()
      .isString(),
    AUTHORIZATION: header('authorization')
      .exists()
      .isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    HEADERS_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
  })
  async attachID(req: Request<{ versionID: string }>, _res: Response, next: NextFunction) {
    const api = await this.services.dataAPI.get(req.headers.authorization);
    try {
      // Version ID can be provided as a header in newer endpoints
      req.params.versionID = (req.headers.versionID as string) ?? req.params.versionID;

      // Facilitate supporting routes that require a versionID but do not have to supply one.
      // We can use the provided API key to look up the project and grab the latest version.
      if (!req.params.versionID && typeof req.headers.authorization === 'string') {
        if (!(api instanceof CreatorDataApi)) {
          throw new VError('Only supported via Creator Data API');
        }

        const project = await api.getProjectUsingAuthorization(req.headers.authorization);
        req.headers.project_id = project._id.toString();
        req.params.versionID = project.devVersion!.toString();
        return next();
      }

      const { projectID } = await api.getVersion(req.params.versionID);
      req.headers.project_id = projectID;
      return next();
    } catch (err) {
      throw new VError('no permissions for this version');
    }
  }
}

export default Project;
