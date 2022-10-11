import express from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

import InteractRouter from './routers/interact';
import PublicRouter from './routers/public';
import StateRouter from './routers/state';
import TestRouter from './routers/test';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get('/health', (_, res) => res.send(`${process.env.NODE_ENV} Healthy`));
  router.use('/interact', InteractRouter(middlewares, controllers));
  router.use('/state', StateRouter(middlewares, controllers));
  router.use('/public', PublicRouter(middlewares, controllers));
  router.use('/test', TestRouter(middlewares));

  return router;
};
