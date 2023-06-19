import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import type { NextFunction, Response } from 'express';
import fetch from 'node-fetch';

import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

class Auth extends AbstractMiddleware {
  private client?: unknown;

  private async getClient() {
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
  }

  authorize(actions: `${string}:${string}`[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const client = await this.getClient();
      if (!client) return next();

      // eslint-disable-next-line import/no-extraneous-dependencies
      const sdk = await import('@voiceflow/sdk-auth/express').catch(() => null);
      if (!sdk) return next();

      return sdk?.createAuthGuard(client)(actions as any[])(req, res, next);
    };
  }

  async verifyIdentity(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const client = await this.getClient();
    if (!client) return next();
    const authorization = req.headers.authorization || req.cookies.auth_vf || '';

    const identity = await client.getIdentity(authorization);
    if (!identity?.identity?.id) throw new Error();

    return next();
  }

  async verifyDMAPIKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!BaseModels.ApiKey.isDialogManagerAPIKey(req.headers.authorization)) {
      res.sendStatus(VError.HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    await this.verifyIdentity(req, res, next);
  }
}

export default Auth;
