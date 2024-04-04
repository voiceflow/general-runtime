import { Config } from '@/types';

import { FullServiceMap } from '.';
import { AbstractManager } from './utils';

class Feedback extends AbstractManager {
  analyticsServiceURI: string | null;

  constructor(services: FullServiceMap, config: Config) {
    super(services, config);

    const host = config.ANALYTICS_API_SERVICE_URI;
    const port = config.ANALYTICS_API_SERVICE_PORT_APP;
    const scheme = process.env.NODE_ENV === 'e2e' ? 'https' : 'http';

    this.analyticsServiceURI = host && port ? new URL(`${scheme}://${host}:${port}`).href : null;
  }

  track = async ({
    name,
    userID,
    ...properties
  }: {
    projectID: string;
    userID: string;
    versionID: string;
    name: string;
  }) => {
    if (!this.analyticsServiceURI) return;

    await this.services.axios
      .post(
        `/v1alpha1/t/event`,
        {
          type: 'track',
          name,
          properties,
          identity: {
            userID: null,
            anonymousID: userID,
          },
        },
        {
          baseURL: this.analyticsServiceURI,
        }
      )
      .catch(() => null);
  };
}

export default Feedback;
