export class IdentityClient {
  private client?: unknown;

  constructor(private readonly endpointURL: string | null) {}

  public async getClient() {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const sdk = await import('@voiceflow/sdk-identity').catch(() => null);
    if (!sdk) return undefined;

    if (!this.client) {
      if (!this.endpointURL) return undefined;

      this.client = new sdk.IdentityClient({ baseURL: this.endpointURL });
    }

    return this.client as InstanceType<typeof sdk.IdentityClient>;
  }
}
