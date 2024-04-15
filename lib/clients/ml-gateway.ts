import { MLGatewayClient } from '@voiceflow/sdk-http-ml-gateway';
import { fetch } from 'undici';

import { AbstractClient } from './utils';

class MLGateway extends AbstractClient {
  private client: MLGatewayClient | undefined;

  async start() {
    if (this.config.ML_GATEWAY_SERVICE_HOST && this.config.ML_GATEWAY_SERVICE_PORT_APP) {
      const baseURL = new URL(
        `${this.config.NODE_ENV === 'e2e' ? 'https' : 'http'}://${this.config.ML_GATEWAY_SERVICE_HOST}:${
          this.config.ML_GATEWAY_SERVICE_PORT_APP
        }`
      ).href;

      this.client = new MLGatewayClient({
        baseURL,
        fetch,
      });
    }
  }

  // no public endpoints allowed
  get private() {
    return this.client?.private;
  }
}

export default MLGateway;
