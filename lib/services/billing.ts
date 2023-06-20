import fetch from 'node-fetch';

import { AbstractManager } from './utils';

export class BillingService extends AbstractManager {
  private client?: unknown;

  private async getClient() {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-billing').catch(() => null);
    if (!sdk) return undefined;

    if (!this.client) {
      const baseURL =
        this.config.BILLING_API_SERVICE_HOST && this.config.BILLING_API_SERVICE_PORT_APP
          ? new URL(
              `${this.config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${this.config.BILLING_API_SERVICE_HOST}:${
                this.config.BILLING_API_SERVICE_PORT_APP
              }`
            ).href
          : null;

      if (!baseURL) return undefined;

      this.client = new sdk.BillingClient({
        baseURL,
        fetch,
      });
    }

    return this.client as InstanceType<typeof sdk.BillingClient>;
  }

  async consumeQuota(workspaceID: string, quotaName: string, count: number) {
    const client = await this.getClient();
    if (!client) return null;

    return client.private.consumeWorkspaceQuotaByName(workspaceID, quotaName, count);
  }
}
