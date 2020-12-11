import express from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

import InteractRouter from './routers/interact';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get('/health', (_, res) => res.send('Healthy'));
  router.use('/interact', InteractRouter(middlewares, controllers));

  return router;
};
