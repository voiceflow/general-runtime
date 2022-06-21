import { Validator } from '@voiceflow/backend-utils';
import * as Utils from '@voiceflow/common';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { isVersionTag, Request, VersionTag } from '@/types';

import { validate } from '../utils';
import { AbstractMiddleware } from './utils';

const VALIDATIONS = {
  HEADERS: {
    VERSION_ID: Validator.header('versionID').isString().optional(),
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
    req.headers.versionID =
      req.params.versionID ?? (typeof req.headers.versionID === 'string' ? req.headers.versionID : undefined);
    if (!req.headers.versionID) {
      throw new VError('Missing versionID in request', VError.HTTP_STATUS.BAD_REQUEST);
    }
    next();
  }

  async attachVersionID(
    req: Request<any, any, { versionID?: string }>,
    _: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      /**
       * Support the use-case where `versionID` is not provided. Note this behaviour should
       * probably be deprecated.
       */
      const versionID = req.headers.versionID || VersionTag.DEVELOPMENT;

      if (!isVersionTag(versionID)) {
        return next();
      }

      const api = await this.services.dataAPI.get(req.headers.authorization).catch(() => {
        throw new VError('Error setting up data API', VError.HTTP_STATUS.UNAUTHORIZED);
      });

      if (!Utils.object.hasProperty(api, 'getProjectUsingAuthorization')) {
        throw new VError(
          'Project lookup via token is unsupported with current server configuration.',
          VError.HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      const project = await api.getProjectUsingAuthorization(req.headers.authorization!).catch(() => {
        throw new VError('Cannot infer project version, provide a specific versionID', VError.HTTP_STATUS.BAD_REQUEST);
      });

      req.headers.versionID = versionID === VersionTag.PRODUCTION ? project.liveVersion : project.devVersion;

      if (versionID === VersionTag.PRODUCTION && !req.headers.versionID) {
        throw new VError('Voiceflow project was not published to production');
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
    try {
      if (!req.headers.versionID) {
        throw new VError('Missing versionID, could not resolve project');
      }

      const api = await this.services.dataAPI.get(req.headers.authorization).catch((error) => {
        throw new VError(`invalid API key: ${error}`, VError.HTTP_STATUS.UNAUTHORIZED);
      });

      const { projectID } = await api.getVersion(req.headers.versionID);
      req.headers.projectID = projectID;

      return next();
    } catch (err) {
      return next(err instanceof VError ? err : new VError('Unknown error', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
  }
}

export default Project;
