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
        project: {
          attachID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            attachID: {
              PARAMS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            interact: {
              HEADERS_PROJECT_ID: 1,
            },
          },
        },
      },
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
        project: {
          attachID: 1,
        },
      },
      validations: {
        controllers: {
          stateManagement: {
            get: {
              HEADERS_PROJECT_ID: 1,
            },
          },
        },
        middlewares: {
          project: {
            attachID: {
              PARAMS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
      },
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
        project: {
          attachID: 1,
        },
      },
      validations: {
        controllers: {
          stateManagement: {
            update: {
              BODY_UPDATE_SESSION: 1,
              HEADERS_PROJECT_ID: 1,
            },
          },
        },
        middlewares: {
          project: {
            attachID: {
              PARAMS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'delete',
    calledPath: '/state/:versionID/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          delete: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          consume: 1,
        },
        project: {
          attachID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            attachID: {
              PARAMS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            delete: {
              HEADERS_PROJECT_ID: 1,
            },
          },
        },
      },
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
        project: {
          attachID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            attachID: {
              PARAMS_VERSION_ID: 1,
              HEADERS_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            reset: {
              HEADERS_PROJECT_ID: 1,
            },
          },
        },
      },
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
