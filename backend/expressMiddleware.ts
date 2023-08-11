import { ExceptionMiddleware } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import compression from 'compression';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
// import cors from 'cors';
import * as Express from 'express';
import helmet from 'helmet';
import _isObject from 'lodash/isObject';

import CONFIG from '@/config';
import { ControllerMap, MiddlewareMap } from '@/lib';
import log from '@/logger';

import api from './api';

/**
 * @class
 */
class ExpressMiddleware {
  /**
   * Attach express middleware to app
   */
  static attach(app: Express.Application, middlewares: MiddlewareMap, controllers: ControllerMap) {
    if (!_isObject(app) || !_isObject(middlewares) || !_isObject(controllers)) {
      throw new Error('must have app, middlewares, and controllers');
    }

    // Reflect requested object for effectively a wildcard CORS setting
    // const corsOptions = {
    //   origin: false,
    //   credentials: true,
    // };
    // TODO: Enabled all cors for testing
    app.use((_, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    app.use(helmet());

    app.use(compression());
    app.use(cookieParser());
    app.enable('trust proxy');
    app.disable('x-powered-by');

    app.use(log.logMiddleware());

    app.use(timeout(String(CONFIG.ERROR_RESPONSE_MS), { respond: false }));
    app.use((req, res, next) => {
      req.on('timeout', () => {
        log.warn(`[http] response timeout ${log.vars({ requestID: req.id })}`);
        res.status(VError.HTTP_STATUS.REQUEST_TIMEOUT).send('response timeout');
      });

      return !req.timedout && next();
    });

    // case-insensitive headers
    app.use((req, _res, next) => {
      req.headers = new Proxy(req.headers, {
        get: (headers, name: string, receiver) => {
          return Reflect.get(headers, name.toLocaleLowerCase(), receiver);
        },
        set: (headers, name: string, value, receiver) => {
          return Reflect.set(headers, name.toLocaleLowerCase(), value, receiver);
        },
      });
      next();
    });

    // All valid routes handled here
    app.use(api(middlewares, controllers));

    app.use(new ExceptionMiddleware().handleError);
  }
}

export default ExpressMiddleware;
