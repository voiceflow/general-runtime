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
    VERSION_ID: Validator.header('versionID').isString().exists(),
    AUTHORIZATION: Validator.header('authorization').isString().exists(),
    VERSION_ID_OPTIONAL: Validator.header('versionID').isString().optional(),
    AUTHORIZATION_OPTIONAL: Validator.header('authorization').isString().optional(),
  },
  PARAMS: {
    VERSION_ID: Validator.param('versionID').optional().isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID_OPTIONAL,
    PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID,
  })
  async unifyVersionID(
    req: Request<{ versionID?: string }, null, { version?: string }>,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    // Version ID provided as param in older versions
    req.headers.versionID = req.headers.versionID ?? req.params.versionID;
    next();
  }

  async attachVersionID(
    req: Request<any, any, { versionID?: string }>,
    _: Response,
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
          throw new VError(
            `provided version ID is neither the published development version nor the production version`,
            404
          );
      }

      return next();
    } catch (err) {
      return next(err instanceof VError ? err : new VError('Unknown error', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
  }

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async resolveVersionAlias(
    req: Request<any, any, { versionID?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return this.attachVersionID(req, res, next);
  }

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION_OPTIONAL,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async resolveVersionAliasLegacy(
    req: Request<any, any, { versionID?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return this.attachVersionID(req, res, next);
  }

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async attachProjectID(
    req: Request<any, any, { versionID?: string }>,
    _: Response,
    next: NextFunction
  ): Promise<void> {
    const api = await this.services.dataAPI.get(req.headers.authorization).catch((error) => {
      throw new VError(`invalid API key: ${error}`, VError.HTTP_STATUS.UNAUTHORIZED);
    });

    try {
      if (!req.headers.versionID) {
        throw new VError('Missing versionID, could not resolve project');
      }
      const { projectID } = await api.getVersion(req.headers.versionID);
      req.headers.projectID = projectID;
      return next();
    } catch (err) {
      return next(err instanceof VError ? err : new VError('Unknown error', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
  }
}

export default Project;
