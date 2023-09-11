import fetch from 'node-fetch';

export class AnalyticsClient {
  private client?: unknown;

  constructor(private readonly endpointURL: string | null) {}

  public async getClient() {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-analytics').catch(() => null);
    if (!sdk) return undefined;

    if (!this.client) {
      if (!this.endpointURL) return undefined;

      this.client = new sdk.AnalyticsClient({
        baseURL: this.endpointURL,
        fetchPonyfill: fetch,
      });
    }

    return this.client as InstanceType<typeof sdk.AnalyticsClient>;
  }
}
