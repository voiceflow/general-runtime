import { Validator } from '@voiceflow/backend-utils';
import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { isVersionTag, Request, VersionTag } from '@/types';

import { validate } from '../utils';
import { AbstractMiddleware } from './utils';

const VALIDATIONS = {
  HEADERS: {
    VERSION_ID: Validator.header('versionID').isString().optional(),
    AUTHORIZATION: Validator.header('authorization').isString().optional(),
  },
  PARAMS: {
    VERSION_ID: Validator.param('versionID').isString().optional(),
    PROJECT_ID: Validator.param('projectID').isString(),
  },
};
class Project extends AbstractMiddleware {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID,
  })
  async unifyVersionID(
    req: Request<{ versionID?: string }, null, { versionID?: string }>,
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

  @validate({
    HEADER_AUTHORIZATION: VALIDATIONS.HEADERS.AUTHORIZATION,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async resolveVersionAlias(
    req: Request<any, any, { versionID?: string }>,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!BaseModels.ApiKey.isDialogManagerAPIKey(req.headers.authorization)) {
        if (!req.headers.versionID) {
          throw new VError('Missing versionID in request', VError.HTTP_STATUS.BAD_REQUEST);
        }

        if (isVersionTag(req.headers.versionID)) {
          throw new VError('Cannot resolve version alias from a workspace API key', VError.HTTP_STATUS.BAD_REQUEST);
        }

        return next();
      }
      if (!req.headers.versionID) {
        req.headers.versionID = VersionTag.DEVELOPMENT;
      }

      const { versionID } = req.headers;

      if (!isVersionTag(versionID)) {
        return next();
      }

      const api = await this.services.dataAPI.get(req.headers.authorization).catch(() => {
        throw new VError('Error setting up data API', VError.HTTP_STATUS.UNAUTHORIZED);
      });

      const project = await api.getProjectUsingAPIKey(req.headers.authorization!).catch(() => {
        throw new VError(
          'Cannot resolve project version, please verify that your API key is correct.',
          VError.HTTP_STATUS.BAD_REQUEST
        );
      });

      const resolvedVersionID = versionID === VersionTag.PRODUCTION ? project.liveVersion : project.devVersion;

      if (!resolvedVersionID) {
        if (versionID === VersionTag.PRODUCTION) {
          throw new VError('Voiceflow project was not published to production', VError.HTTP_STATUS.BAD_REQUEST);
        } else {
          throw new VError('Unable to resolve version alias', VError.HTTP_STATUS.BAD_REQUEST);
        }
      }

      req.headers.versionID = resolvedVersionID;

      return next();
    } catch (err) {
      return next(err instanceof VError ? err : new VError('Unknown error', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
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

      const api = await this.services.dataAPI.get(req.headers.authorization);

      const { projectID } = await api.getVersion(req.headers.versionID).catch(() => {
        throw new VError(
          `Could not resolve project with version ID ${req.headers.versionID}`,
          VError.HTTP_STATUS.BAD_REQUEST
        );
      });

      req.headers.projectID = projectID;

      return next();
    } catch (err) {
      return next(err instanceof VError ? err : new VError('Unknown error', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
  }

  @validate({
    PROJECT_ID: VALIDATIONS.PARAMS.PROJECT_ID,
    HEADER_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async resolvePublicProjectID(
    req: Request<{ projectID: string }, any, { versionID?: string }>,
    _: Response,
    next: NextFunction
  ): Promise<void> {
    if (!req.params.projectID) {
      throw new VError('Missing projectID, could not resolve project');
    }

    // this should call remote data api
    const api = await this.services.dataAPI.get();

    if (!api) {
      throw new VError('no database connection', VError.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const project = await api?.getProject(req.params.projectID).catch(() => {
      throw new VError('no access to project', VError.HTTP_STATUS.UNAUTHORIZED);
    });

    if (project.apiPrivacy !== BaseModels.Project.Privacy.PUBLIC) {
      throw new VError('no access to project', VError.HTTP_STATUS.UNAUTHORIZED);
    }

    req.headers.projectID = req.params.projectID;

    if (req.headers.versionID === VersionTag.PRODUCTION) {
      req.headers.versionID = project.liveVersion;
    } else if (req.headers.versionID === VersionTag.DEVELOPMENT) {
      req.headers.versionID = project.devVersion;
    } else if (!req.headers.versionID) {
      req.headers.versionID = project.devVersion;
    }

    return next();
  }
}

export default Project;
