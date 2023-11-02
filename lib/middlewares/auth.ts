import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import fetch from 'node-fetch';

import { Next, Request, Response } from '@/types';

import { AbstractMiddleware } from './utils';

function formatAuthorizationToken(incomingAuthorizationToken: string) {
  if (incomingAuthorizationToken.startsWith('ApiKey ')) {
    return incomingAuthorizationToken;
  }

  if (incomingAuthorizationToken.startsWith('VF.')) {
    return `ApiKey ${incomingAuthorizationToken}`;
  }

  if (!incomingAuthorizationToken.startsWith('Bearer ')) {
    return `Bearer ${incomingAuthorizationToken}`;
  }

  return incomingAuthorizationToken;
}

class Auth extends AbstractMiddleware {
  private client?: unknown;

  private getClient = async () => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-auth').catch(() => null);
    if (!sdk) return undefined;

    if (!this.client) {
      const baseURL =
        this.config.AUTH_API_SERVICE_HOST && this.config.AUTH_API_SERVICE_PORT_APP
          ? new URL(
              `${this.config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${this.config.AUTH_API_SERVICE_HOST}:${
                this.config.AUTH_API_SERVICE_PORT_APP
              }`
            ).href
          : null;

      if (!baseURL) return undefined;

      this.client = new sdk.AuthClient({
        baseURL,
        fetch,
      });
    }

    return this.client as InstanceType<typeof sdk.AuthClient>;
  };

  // TODO fix this any type once the sdk is not an optional dependency
  authorize = (actions: `${string}:${string}`[], getResource?: any) => {
    return async (req: Request, res: Response, next: Next) => {
      try {
        const client = await this.getClient();
        if (!client) return next();

        // eslint-disable-next-line import/no-extraneous-dependencies
        const sdk = await import('@voiceflow/sdk-auth/express').catch(() => null);
        if (!sdk) return next();

        return sdk?.createAuthGuard(client, getResource)(actions as any[])(req, res, next);
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }
    };
  };

  verifyIdentity = async (req: Request, _res: Response, next: Next): Promise<void> => {
    try {
      const client = await this.getClient();
      if (!client) return next();
      const authorization = req.headers.authorization || req.cookies.auth_vf || '';
      if (!authorization) throw new Error();

      req.headers.authorization = formatAuthorizationToken(authorization);

      const identity = await client.getIdentity(req.headers.authorization);

      if (!identity?.identity?.id) throw new Error();

      return next();
    } catch {
      return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
    }
  };

  async verifyDMAPIKey(req: Request, res: Response, next: Next): Promise<void> {
    if (!BaseModels.ApiKey.isDialogManagerAPIKey(req.headers.authorization)) {
      return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
    }

    return this.verifyIdentity(req, res, next);
  }

  verifyParamConsistency = (
    getProjectID: (req: Request) => string | undefined,
    getAuth: (req: Request) => string | undefined,
    getVersionID: (req: Request) => string | undefined
  ) => {
    return async (req: Request, _res: Response, next: Next) => {
      try {
        const projectID = getProjectID(req);
        const auth = getAuth(req);
        const versionID = getVersionID(req);

        const api = await this.services.dataAPI.get();
        const authenticatedProject = auth ? await api.getProject(auth) : null;
        const version = versionID ? await api.getVersion(versionID) : null;

        const projectIDs = [projectID, authenticatedProject?._id, version?.projectID].filter((item) => item);
        const isInconsistent = projectIDs.length > 0 && projectIDs.some((item, _, arr) => item !== arr[0]);

        if (isInconsistent) {
          return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
        }

        return next();
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }
    };
  };
}

export default Auth;
