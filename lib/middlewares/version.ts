import VError from '@voiceflow/verror';
import { NextFunction, Request, Response } from 'express';

import { AbstractMiddleware } from './utils';

class RateLimit extends AbstractMiddleware {
  async hasPermission(req: Request<{ versionID: string }>, _res: Response, next: NextFunction) {
    const api = await this.services.dataAPI.get(req.headers.authorization);
    try {
      await api.getVersion(req.params.versionID);
      return next();
    } catch (err) {
      throw new VError('no permissions for this version');
    }
  }
}

export default RateLimit;
