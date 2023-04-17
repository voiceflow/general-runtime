import { formatAuthorizationToken } from '@voiceflow/sdk-auth/express';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

class Auth extends AbstractMiddleware {
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!this.services.auth) throw new Error();

      const token = formatAuthorizationToken(req.headers.authorization || req.cookies.auth_vf || '');
      if (!token) throw new Error();

      const identity = await this.services.auth.identity(token);
      if (!identity?.identity?.id) throw new Error();
    } catch (error) {
      res.sendStatus(401);
      return;
    }

    next();
  }
}

export default Auth;
