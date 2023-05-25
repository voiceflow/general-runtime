import { FixtureGenerator } from '@voiceflow/backend-utils';
import getPort from 'get-port';
import Sinon from 'sinon';

import { ServiceManager } from '../../backend';
import config from '../../config';

// allow passing down override stubs
// the consumeResource middleware is a fn that returns a middleware
const createFixture = async ({ consumeResourceStub } = { consumeResourceStub: Sinon.stub() }) => {
  // Use random port for the metrics route to avoid EADDRINUSE errors
  const serviceManager = new ServiceManager({ ...config, PORT_METRICS: (await getPort()).toString() });

  const serviceManagerFixture = await FixtureGenerator.createFixture(serviceManager);
  return {
    ...serviceManagerFixture,
    middlewares: {
      ...serviceManagerFixture.middlewares,
      rateLimit: {
        ...serviceManagerFixture.middlewares.rateLimit,
        consumeResource: () => consumeResourceStub,
      },
    },
  } as unknown as ServiceManager;
};

export default {
  createFixture,
  // allow passing down override stubs for expects
  // since the consumeResource middleware is a fn that returns a middleware the checkFixture doesnt treat it properly
  // we need to instead override it with the returned value from the fn call
  checkFixture: (fixtures: any, expected: any, { consumeResourceStub } = { consumeResourceStub: Sinon.stub() }) => {
    return FixtureGenerator.checkFixture(
      {
        ...fixtures,
        middlewares: {
          ...fixtures.middlewares,
          rateLimit: {
            ...fixtures.middlewares.rateLimit,
            consumeResource: consumeResourceStub,
          },
        },
      },
      expected
    );
  },
};
