import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { AbstractMiddleware } from './utils';

export class BillingMiddleware extends AbstractMiddleware {
  checkQuota(quotaName: string, getWorkspaceID: (req: Request) => string | undefined) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const workspaceID = getWorkspaceID(req);
      if (!workspaceID) {
        res.sendStatus(401);
        return;
      }

      await this.services.billing.consumeQuota(workspaceID, quotaName, 0);
      next();
    };
  }
}
