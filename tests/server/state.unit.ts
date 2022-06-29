import { expect } from 'chai';
import { Express } from 'express';
import sinon from 'sinon';
import request from 'supertest';

import Server from '@/server';

import GetApp from '../getAppForTest';
import fixtures from './fixture';

const tests = [
  {
    method: 'post',
    calledPath: '/state/user/:userID/interact',
    expected: {
      controllers: {
        stateManagement: {
          interact: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            interact: {
              HEADERS_PROJECT_ID: 1,
              HEADERS_VERSION_ID: 1,
              QUERY_VERBOSE: 1,
              QUERY_LOGS: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'get',
    calledPath: '/state/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          get: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
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
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'put',
    calledPath: '/state/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          update: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
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
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'delete',
    calledPath: '/state/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          delete: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
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
    calledPath: '/state/user/:userID',
    expected: {
      controllers: {
        stateManagement: {
          reset: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            reset: {
              HEADERS_PROJECT_ID: 1,
              HEADERS_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'patch',
    calledPath: '/state/user/:userID/variables',
    expected: {
      controllers: {
        stateManagement: {
          updateVariables: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        controllers: {
          stateManagement: {
            updateVariables: {
              HEADERS_PROJECT_ID: 1,
              BODY_UPDATE_VARIABLES: 1,
            },
          },
        },
        middlewares: {
          project: {
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
  // legacy routes
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
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            interact: {
              HEADERS_PROJECT_ID: 1,
              HEADERS_VERSION_ID: 1,
              QUERY_VERBOSE: 1,
              QUERY_LOGS: 1,
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
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
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
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
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
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
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
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
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
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
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
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
        controllers: {
          stateManagement: {
            reset: {
              HEADERS_PROJECT_ID: 1,
              HEADERS_VERSION_ID: 1,
            },
          },
        },
      },
    },
  },
  {
    method: 'patch',
    calledPath: '/state/:versionID/user/:userID/variables',
    expected: {
      controllers: {
        stateManagement: {
          updateVariables: 1,
        },
      },
      middlewares: {
        rateLimit: {
          verify: 1,
          versionConsume: 1,
        },
        project: {
          unifyVersionID: 1,
          resolveVersionAlias: 1,
          attachProjectID: 1,
        },
      },
      validations: {
        controllers: {
          stateManagement: {
            updateVariables: {
              HEADERS_PROJECT_ID: 1,
              BODY_UPDATE_VARIABLES: 1,
            },
          },
        },
        middlewares: {
          project: {
            unifyVersionID: {
              HEADER_VERSION_ID: 1,
              PARAMS_VERSION_ID: 1,
            },
            resolveVersionAlias: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
            attachProjectID: {
              HEADER_VERSION_ID: 1,
              HEADER_AUTHORIZATION: 1,
            },
          },
        },
      },
    },
  },
];

describe('state route unit tests', () => {
  let app: Express | null;
  let server: Server;

  afterEach(async () => {
    sinon.restore();
    await server.stop();
  });

  tests.forEach((test) => {
    it(`${test.method} ${test.calledPath}`, async () => {
      const fixture = await fixtures.createFixture();
      ({ app, server } = await GetApp(fixture));

      const response = await (request(app) as any)[test.method](test.calledPath);

      fixtures.checkFixture(fixture, test.expected);
      expect(response.body).to.eql({ done: 'done' });
    });
  });
});
