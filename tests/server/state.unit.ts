import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import GetApp from '../getAppForTest';
import fixtures from './fixture';

const tests = [
  {
    method: 'post',
    calledPath: '/state/:versionID/user/:userID/interact',
    expected: {
      controllers: {
        stateManagement: {
          interact: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          consume: 1,
        },
      },
      validations: {},
    },
  },
  {
    method: 'get',
    calledPath: '/state/:versionID/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          get: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          consume: 1,
        },
        version: {
          hasPermission: 1,
        },
      },
      validations: {},
    },
  },
  {
    method: 'put',
    calledPath: '/state/:versionID/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          update: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          consume: 1,
        },
        version: {
          hasPermission: 1,
        },
      },
      validations: {},
    },
  },
  {
    method: 'post',
    calledPath: '/state/:versionID/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          reset: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          consume: 1,
        },
      },
      validations: {},
    },
  },
];

describe('state route unit tests', () => {
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
