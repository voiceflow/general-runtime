import VError from '@voiceflow/verror';
import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { QuotaName } from '../services/billing';
import { AbstractMiddleware } from './utils';

export class BillingMiddleware extends AbstractMiddleware {
  checkQuota = (quotaName: QuotaName, getWorkspaceID: (req: Request) => string | undefined) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const workspaceID = getWorkspaceID(req);
        if (!workspaceID) {
          return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
        }

        if (!(await this.services.billing.checkQuota(workspaceID, quotaName))) {
          return next(new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED));
        }

        return next();
      } catch (err) {
        return next(new VError('Unauthorized', VError.HTTP_STATUS.UNAUTHORIZED));
      }
    };
  };
}
