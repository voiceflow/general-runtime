import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { factory } from '../utils';
import { AbstractMiddleware } from './utils';

export class BillingMiddleware extends AbstractMiddleware {
  @factory()
  checkQuota(quotaName: string, getWorkspaceID: (req: Request) => string | undefined) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const workspaceID = getWorkspaceID(req);
        if (!workspaceID) {
          return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
        }

        await this.services.billing.consumeQuota(workspaceID, quotaName, 0);
        return next();
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }
    };
  }
}
