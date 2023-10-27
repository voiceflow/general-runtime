import { NextFunction, Response } from 'express';

import { Request } from '@/types';

import { ItemName, ResourceType } from '../services/billing';
import { AbstractMiddleware } from './utils';

export class BillingMiddleware extends AbstractMiddleware {
  authorize = (params: {
    resourceType: ResourceType | ((req: Request) => ResourceType);
    resourceID: string | ((req: Request) => string);
    itemName: ItemName | ((req: Request) => ItemName);
    itemValue?: number | ((req: Request) => number | undefined);
  }) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const client = await this.services.billing.getClient();
      if (!client) return next();

      // eslint-disable-next-line import/no-extraneous-dependencies
      const sdk = await import('@voiceflow/sdk-billing/express').catch(() => null);
      if (!sdk) return next();

      return sdk.createAuthorizeMiddleware(client)(params)(req, res, next);
    };
  };
}
