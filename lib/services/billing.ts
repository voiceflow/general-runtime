import fetch from 'node-fetch';

import { AbstractManager } from './utils';

export class BillingService extends AbstractManager {
  private client?: unknown;

  async consumeQuota(workspaceID: string, quotaName: string, count: number) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-billing').catch(() => null);
    if (!sdk) return null;

    if (!this.client) {
      const baseURL =
        this.config.BILLING_API_SERVICE_HOST && this.config.BILLING_API_SERVICE_PORT_APP
          ? new URL(
              `${this.config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${this.config.BILLING_API_SERVICE_HOST}:${
                this.config.BILLING_API_SERVICE_PORT_APP
              }`
            ).href
          : null;

      if (!baseURL) return null;

      this.client = new sdk.BillingClient({
        baseURL,
        fetch,
      });
    }

    return (this.client as InstanceType<typeof sdk.BillingClient>).private.consumeWorkspaceQuotaByName(
      workspaceID,
      quotaName,
      count
    );
  }
}
