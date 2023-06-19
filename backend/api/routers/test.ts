import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.auth.verify);
  router.use(middlewares.rateLimit.verify);

  router.post(
    '/api',
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization, 'api'),
    controllers.test.testAPI
  );

  router.post(
    '/code',
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization, 'code'),
    controllers.test.testCode
  );

  router.post(
    '/knowledge-base',
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization, 'knowledge-base'),
    controllers.test.testKnowledgeBase
  );

  router.post(
    '/completion',
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization, 'completion'),
    controllers.test.testCompletion
  );

  return router;
};
