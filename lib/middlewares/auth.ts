import { BaseModels } from '@voiceflow/base-types';
import { formatAuthorizationToken } from '@voiceflow/sdk-auth/express';
import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

class Auth extends AbstractMiddleware {
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!this.services.auth) throw new Error();

      const authorization = req.headers.authorization || req.cookies.auth_vf || '';

      const token = formatAuthorizationToken(authorization);
      if (!token) throw new Error();

      req.headers.authorization = authorization;

      const identity = await this.services.auth.identity(token);
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
