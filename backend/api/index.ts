import express from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

import InteractRouter from './routers/interact';
import StateRouter from './routers/state';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get('/health', (_, res) => res.send('Healthy'));
  router.use('/interact', InteractRouter(middlewares, controllers));
  router.use('/state', StateRouter(middlewares, controllers));

  return router;
};
