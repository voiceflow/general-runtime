import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

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
  authServiceURI: string | null;

  constructor(services: AbstractMiddleware['services'], config: AbstractMiddleware['config']) {
    super(services, config);

    this.authServiceURI =
      this.config.AUTH_API_SERVICE_HOST && this.config.AUTH_API_SERVICE_PORT_APP
        ? new URL(
            `${this.config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${this.config.AUTH_API_SERVICE_HOST}:${
              this.config.AUTH_API_SERVICE_PORT_APP
            }`
          ).href
        : null;
  }

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!this.authServiceURI) throw new Error();

      const authorization = req.headers.authorization || req.cookies.auth_vf || '';

      const token = formatAuthorizationToken(authorization);
      if (!token) throw new Error();

      req.headers.authorization = authorization;

      const identity = await this.services.axios
        .get(`/v1alpha1/identity`, {
          headers: { authorization: token },
          baseURL: this.authServiceURI,
        })
        .then((res) => res.data);

      if (!identity?.identity?.id) throw new Error();
    } catch (error) {
      res.sendStatus(VError.HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    next();
  }

  async verifyDMAPIKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!BaseModels.ApiKey.isDialogManagerAPIKey(req.headers.authorization)) {
      res.sendStatus(VError.HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    await this.verify(req, res, next);
  }
}

export default Auth;
