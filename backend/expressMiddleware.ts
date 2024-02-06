import VError from '@voiceflow/verror';
import compression from 'compression';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import * as Express from 'express';
import helmet from 'helmet';
import _isObject from 'lodash/isObject';

import CONFIG from '@/config';
import { ControllerMap, MiddlewareMap } from '@/lib';
import log, { createLogMiddleware } from '@/logger';

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
    const corsOptions = {
      origin: true,
      credentials: true,
    };

    app.use(cors(corsOptions));
    app.use(helmet());

    app.use(compression());
    app.use(cookieParser());
    app.enable('trust proxy');
    app.disable('x-powered-by');

    app.use(timeout(String(CONFIG.ERROR_RESPONSE_MS), { respond: false }));
    app.use((req, res, next) => {
      req.on('timeout', () => {
        log.warn('[http] response timeout %o', { requestID: req.id });
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

    app.use(createLogMiddleware());

    // All valid routes handled here
    app.use(api(middlewares, controllers));
  }
}

export default ExpressMiddleware;
