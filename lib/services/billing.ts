import fetch from 'node-fetch';

import { AbstractManager } from './utils';

// we cannot import these from the sdk-billing because its an optional dependency on the runtime
// once that changes we should refactor this
export enum ItemName {
  AITokens = 'addon-tokens',
}

export enum ResourceType {
  WORKSPACE = 'workspace',
}

export class BillingService extends AbstractManager {
  private client?: unknown;

  public async getClient() {
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

  async trackUsage(resourceType: ResourceType, resourceID: string, itemName: ItemName, itemValue: number) {
    const client = await this.getClient();
    if (!client) return null;

    return client.private.trackUsage({
      resourceType,
      resourceID,
      item: itemName,
      value: itemValue,
    });
  }

  async authorize(resourceType: ResourceType, resourceID: string, itemName: ItemName, itemValue?: number) {
    const client = await this.getClient();
    if (!client) return null;

    // TODO: fix types here
    return client.private.authorize({
      resourceType,
      resourceID,
      item: itemName as any,
      value: itemValue,
    });
  }
}
