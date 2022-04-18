import { Validator } from '@voiceflow/backend-utils';
import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { validate } from '@/lib/utils';
import { CreatorDataApi } from '@/runtime';
import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

const { header } = Validator;
const VALIDATIONS = {
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

  async unifyVersionID(req: Request<{ versionID?: string }, null, { version?: string }>, _res: Response, next: NextFunction): Promise<void> {
    // Version ID provided as param in older versions
    req.headers.versionID = req.headers.versionID ?? req.params.versionID;
    next();
  }

  @validate({
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    HEADERS_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
  })
  async attachID(req: Request<Record<string, unknown>, unknown, { versionID?: string }>, _res: Response, next: NextFunction): Promise<void> {
    const api = await this.services.dataAPI.get(req.headers.authorization).catch((error) => {
      throw new VError(`invalid API key: ${error}`, VError.HTTP_STATUS.UNAUTHORIZED);
    });

    try {
      // Facilitate supporting routes that require a versionID but do not have to supply one.
      // We can use the provided API key to look up the project and grab the latest version.
      if (!req.headers.versionID && BaseModels.ApiKey.isDialogManagerAPIKey(req.headers.authorization)) {
        if (!(api instanceof CreatorDataApi)) {
          throw new VError('Version lookup only supported via Creator Data API', VError.HTTP_STATUS.UNAUTHORIZED);
        }

        const project = await api.getProjectUsingAuthorization(req.headers.authorization).catch(() => null);
        if (!project) {
          throw new VError('Cannot infer project version, provide a specific version in the versionID header', 404);
        }

        req.headers.prototype = 'api';
        req.headers.projectID = project._id.toString();
        req.headers.versionID = project.devVersion!.toString();

        return next();
      }

      if (!req.headers.versionID) {
        throw new VError('Missing versionID header', 400);
      }

      const { projectID } = await api.getVersion(req.headers.versionID);

      req.headers.projectID = projectID;

      return next();
    } catch (err) {
      if (err instanceof VError) throw err;
      else throw new VError('no permissions for this version', VError.HTTP_STATUS.UNAUTHORIZED);
    }
  }
}

export default Project;
