import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';
import { Request } from '@/types';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  router.post(
    '/query',
    middlewares.auth.verifyIdentity,
    middlewares.auth.verifyParamConsistency((req: Request) => ({
      projectID: req.body.projectID,
      auth: req.headers.authorization,
      versionID: req.body.versionID,
    })),
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization, 'knowledge-base'),
    controllers.test.testKnowledgeBase
  );

  return router;
};
