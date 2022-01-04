import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { validate } from '@/lib/utils';
import { CreatorDataApi } from '@/runtime';
import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

const { header } = Validator;
const VALIDATIONS = {
  HEADERS: {
    VERSION: header('version')
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
    req.headers.version = req.headers.version ?? req.params.versionID;
    next();
  }

  @validate({
    HEADERS_VERSION: VALIDATIONS.HEADERS.VERSION,
    HEADERS_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
  })
  async attachID(req: Request<Record<string, unknown>, unknown, { version?: string }>, _res: Response, next: NextFunction): Promise<void> {
    const api = await this.services.dataAPI.get(req.headers.authorization);
    try {
      // Facilitate supporting routes that require a versionID but do not have to supply one.
      // We can use the provided API key to look up the project and grab the latest version.
      if (!req.headers.version && typeof req.headers.authorization === 'string') {
        if (!(api instanceof CreatorDataApi)) {
          throw new VError('Version lookup only supported via Creator Data API');
        }

        const project = await api.getProjectUsingAuthorization(req.headers.authorization);
        if (!project) {
          throw new VError('Cannot infer project version, provide a specific version header', 404);
        }

        req.headers.project = project._id.toString();
        req.headers.version = project.devVersion!.toString();
        return next();
      }

      if (!req.headers.version) {
        throw new Error();
      }

      const { projectID } = await api.getVersion(req.headers.version);
      req.headers.project = projectID;
      return next();
    } catch (err) {
      if (err instanceof VError) throw err;
      else throw new VError('no permissions for this version');
    }
  }
}

export default Project;
