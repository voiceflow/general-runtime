import VError from '@voiceflow/verror';
import fetch from 'node-fetch';

import { Next, Request, Response } from '@/types';

import { AbstractMiddleware } from './utils';

class Auth extends AbstractMiddleware {
  private client?: unknown;

  private permissionGuard?: unknown;

  private identityGuard?: unknown;

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

  private getPermissionGuard = async () => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-auth/express').catch(() => null);
    if (!sdk) return undefined;

    if (!this.permissionGuard) {
      const client = await this.getClient();
      if (!client) return undefined;

      this.permissionGuard = sdk?.createPermissionGuard(client);
    }

    return this.permissionGuard as ReturnType<typeof sdk.createPermissionGuard>;
  };

  authorize = (actions: `${string}:${string}`[]) => {
    return async (req: Request, res: Response, next: Next) => {
      try {
        const guard = await this.getPermissionGuard();
        if (!guard) return next();

        return guard(actions as any[])(req, res, next);
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }
    };
  };

  private getIdentityGuard = async () => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-auth/express').catch(() => null);
    if (!sdk) return undefined;

    if (!this.identityGuard) {
      const client = await this.getClient();
      if (!client) return undefined;

      this.identityGuard = sdk?.createIdentityGuard(client);
    }

    return this.identityGuard as ReturnType<typeof sdk.createIdentityGuard>;
  };

  verifyIdentity = async (req: Request, res: Response, next: Next): Promise<void> => {
    try {
      const guard = await this.getIdentityGuard();
      if (!guard) return next();

      return guard()(req, res, next);
    } catch {
      return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
    }
  };

  verifyParamConsistency = (
    mapFromRequest: (req: Request) => { projectID?: string; auth?: string; versionID?: string }
  ) => {
    return async (req: Request, _res: Response, next: Next) => {
      try {
        const { projectID, auth, versionID } = mapFromRequest(req);

        const api = await this.services.dataAPI.get();
        const authenticatedProject = auth ? await api.getProject(auth) : null;
        const version = versionID ? await api.getVersion(versionID) : null;

        const projectIDs = new Set([projectID, authenticatedProject?._id, version?.projectID].filter((item) => !!item));

        // at least 1 and exactly 1 unique ID
        const isConsistent = projectIDs.size === 1;

        if (!isConsistent) {
          throw new VError('Inconsistent projectIDs in request parameters');
        }
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }

      return next();
    };
  };
}

export default Auth;
