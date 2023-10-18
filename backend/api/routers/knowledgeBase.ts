import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  router.post(
    '/query',
    middlewares.auth.verifyDMAPIKey,
    middlewares.auth.verifyParamConsistency(
      (req) => req.body.projectID,
      (req) => req.headers.authorization,
      (req) => req.body.versionID
    ),
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization, 'knowledge-base'),
    controllers.test.testKnowledgeBase
  );

  return router;
};
