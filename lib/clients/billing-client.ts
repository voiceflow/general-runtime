import fetch from 'node-fetch';

export class BillingClient {
  private client?: unknown;

  constructor(private readonly endpointURL: string | null) {}

  public async getClient() {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-billing').catch(() => null);
    if (!sdk) return undefined;

    if (!this.client) {
      if (!this.endpointURL) return undefined;

      this.client = new sdk.BillingClient({ baseURL: this.endpointURL, fetch });
    }

    return this.client as InstanceType<typeof sdk.BillingClient>;
  }
}
