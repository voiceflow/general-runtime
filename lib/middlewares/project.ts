import { Validator } from '@voiceflow/backend-utils';
import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { validate } from '@/lib/utils';
import { CreatorDataApi } from '@/runtime';
import { PredictionStage, Request } from '@/types';

import { AbstractMiddleware } from './utils';

const { header } = Validator;
const VALIDATIONS = {
  HEADERS: {
    VERSION_ID: header('versionID').optional().isString(),
    AUTHORIZATION: header('authorization').exists().isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  async unifyVersionID(
    req: Request<{ versionID?: string }, null, { version?: string }>,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    // Version ID provided as param in older versions
    req.headers.versionID = req.headers.versionID ?? req.params.versionID;
    next();
  }

  @validate({
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    HEADERS_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
  })
  async attachID(
    req: Request<Record<string, unknown>, unknown, { versionID?: string }>,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    const { versionID, authorization: apiKey } = req.headers;

    try {
      const api = await this.services.dataAPI.get(apiKey).catch((error) => {
        throw new VError(`invalid API key: ${error}`, VError.HTTP_STATUS.UNAUTHORIZED);
      });

      if (!BaseModels.ApiKey.isDialogManagerAPIKey(apiKey)) {
        throw new VError('invalid Dialog Manager API Key', 400);
      }

      if (!(api instanceof CreatorDataApi)) {
        throw new VError('version lookup only supported via Creator Data API', VError.HTTP_STATUS.UNAUTHORIZED);
      }

      const project = await api.getProjectUsingAuthorization(apiKey).catch(() => null);
      if (!project) {
        throw new VError('cannot infer project version, provide a specific version in the versionID header', 404);
      }

      const { devVersion, liveVersion, _id: projectID } = project;

      // CASE 1
      // Facilitate supporting routes that require a versionID but do not have to supply one.
      // We can use the provided API key to look up the project and grab the latest version.
      if (!versionID) {
        req.headers.prototype = 'api';
        req.headers.versionID = devVersion;

        req.headers.projectID = projectID;
        req.headers.stage = PredictionStage.DEVELOPMENT;

        return next();
      }

      // CASE 2 - VersionID was supplied
      if (!versionID) {
        throw new VError('missing versionID header', 400);
      }

      req.headers.projectID = projectID;

      // Resolve versionID if it is an alias like 'production'
      if (Object.values<string>(PredictionStage).includes(versionID)) {
        req.headers.versionID = versionID === PredictionStage.PRODUCTION ? liveVersion : devVersion;

        if (!req.headers.versionID) {
          throw new VError(`there is no published model for '${versionID}'`, 404);
        }
      }

      // Attach the `stage` based on the version that was provided.
      switch (req.headers.versionID) {
        case liveVersion:
          req.headers.stage = PredictionStage.PRODUCTION;
          break;
        case devVersion:
          req.headers.stage = PredictionStage.DEVELOPMENT;
          break;
        default:
          throw new VError(`provided version ID is neither the published development version nor the production version`, 404);
      }

      return next();
    } catch (err) {
      if (err instanceof VError) throw err;
      else throw new VError('no permissions for this version', VError.HTTP_STATUS.UNAUTHORIZED);
    }
  }
}

export default Project;
