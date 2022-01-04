import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';

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
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          attachID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            attachID: {
              HEADERS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
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
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          attachID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            attachID: {
              HEADERS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
  // legacy routes
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
        project: { unifyVersionID: 1 },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {},
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
        project: { unifyVersionID: 1 },
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
      },
      validations: {},
    },
  },
];

describe('interact route unit tests', () => {
  let app;
  let server;

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
