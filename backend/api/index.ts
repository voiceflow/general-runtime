import express from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

import FeedbackRouter from './routers/feedback';
import InteractRouter from './routers/interact';
import KnowledgeBaseRouter from './routers/knowledgeBase';
import NLURouter from './routers/nlu';
import PublicRouter from './routers/public';
import StateRouter from './routers/state';
import TestRouter from './routers/test';
import TranscriptRouter from './routers/transcript';
import InteractV2Router from './routers/v2/interact';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get('/health', (_, res) => res.send(`${process.env.NODE_ENV} Healthy`));
  router.use('/interact', InteractRouter(middlewares, controllers));
  router.use('/feedback', FeedbackRouter(middlewares, controllers));
  router.use('/state', StateRouter(middlewares, controllers));
  router.use('/public', PublicRouter(middlewares, controllers));
  router.use('/test', TestRouter(middlewares, controllers));
  router.use('/knowledge-base', KnowledgeBaseRouter(middlewares, controllers));
  router.use('/transcripts', TranscriptRouter(middlewares, controllers));
  router.use('/nlu', NLURouter(middlewares, controllers));

  router.use('/v2beta1/interact', InteractV2Router(middlewares, controllers));

  return router;
};
