import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { CreatorDataApi } from '@/runtime';
import { isVersionTag, Request, VersionTag } from '@/types';

import { validate } from '../utils';
import { AbstractMiddleware } from './utils';

const VALIDATIONS = {
  HEADERS: {
    VERSION_ID: Validator.header('versionID').exists().isString(),
    AUTHORIZATION: Validator.header('authorization').exists().isString(),
  },
  PARAMS: {
    VERSION_ID: Validator.param('versionID').optional().isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID.optional(),
    PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID,
  })
  async unifyVersionID(req: Request<{ versionID?: string }, null, { version?: string }>, _res: Response, next: NextFunction): Promise<void> {
    req.headers.versionID = req.params.versionID ?? (typeof req.headers.versionID === 'string' ? req.headers.versionID : undefined);
    if (!req.headers.versionID) {
      throw new VError('Missing versionID in request', VError.HTTP_STATUS.BAD_REQUEST);
    }
    next();
  }

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async resolveVersionAlias(req: Request<any, any, { versionID?: string }>, _res: Response, next: NextFunction) {
    if (!isVersionTag(req.headers.versionID)) {
      next();
      return;
    }

    const api = await this.services.dataAPI.get(req.headers.authorization).catch((error) => {
      throw new VError(`invalid API key: ${error}`, VError.HTTP_STATUS.UNAUTHORIZED);
    });

    if (!(api instanceof CreatorDataApi)) {
      throw new VError('Version lookup only supported via Creator Data API', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const project = await api.getProjectUsingAuthorization(req.headers.authorization!).catch(() => null);
    if (!project) {
      throw new VError('Cannot infer project version, provide a specific versionID', VError.HTTP_STATUS.BAD_REQUEST);
    }

    req.headers.versionID = req.headers.versionID === VersionTag.PRODUCTION ? project.liveVersion : project.devVersion;

    next();
  }
}

export default Project;
