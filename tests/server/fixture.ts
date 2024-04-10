import { FixtureGenerator } from '@voiceflow/backend-utils';
import getPort from 'get-port';

import { ServiceManager } from '../../backend';
import config from '../../config';

const createFixture = async () => {
  // Use random port for the metrics route to avoid EADDRINUSE errors
  const serviceManager = new ServiceManager({
    ...config,
    PORT_METRICS: (await getPort()).toString(),
  });

  return FixtureGenerator.createFixture(serviceManager);
};

export default {
  createFixture,
  checkFixture: FixtureGenerator.checkFixture,
};
