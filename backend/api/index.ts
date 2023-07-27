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

  return router;
};
