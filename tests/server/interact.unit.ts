import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import Server from '@/server';

import GetApp from '../getAppForTest';
import fixtures from './fixture';

const tests = [
  {
    method: 'get',
    calledPath: '/interact/state',
    expected: {
      controllers: {
        interact: {
          state: 1,
        },
      },
      middlewares: {
        project: {
          resolveVersionAlias: 1,
        },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'post',
    calledPath: '/interact',
    expected: {
      controllers: {
        interact: {
          handler: 1,
        },
      },
      middlewares: {
        project: {
          resolveVersionAlias: 1,
        },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'get',
    calledPath: '/interact/:versionID/state',
    expected: {
      controllers: {
        interact: {
          state: 1,
        },
      },
      middlewares: {
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
        },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'post',
    calledPath: '/interact/:versionID',
    expected: {
      controllers: {
        interact: {
          handler: 1,
        },
      },
      middlewares: {
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
        },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_AUTHORIZATION: 1,
              HEADER_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
];

describe('interact route unit tests', async () => {
  let app: Server['app'];
  let server: Server;

  afterEach(async () => {
    sinon.restore();
    await server.stop();
  });

  tests.forEach((test) => {
    it(`${test.method} ${test.calledPath}`, async () => {
      const fixture = await fixtures.createFixture();
      ({ app, server } = await GetApp(fixture));

      const response = await request(app)[test.method](test.calledPath);

      fixtures.checkFixture(fixture, test.expected);
      expect(response.body).to.eql({ done: 'done' });
    });
  });
});
