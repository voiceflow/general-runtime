import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';
import { Request } from '@/types';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post(
    '/functions',
    middlewares.auth.verifyIdentity,
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization ?? req.cookies.auth_vf, 'function'),
    controllers.test.testFunction
  );

  router.post(
    '/:workspaceID/api',
    middlewares.auth.authorize(['workspace:READ']),
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'api'),
    controllers.test.testAPI
  );

  router.post(
    '/:workspaceID/code',
    middlewares.auth.authorize(['workspace:READ']),
    middlewares.rateLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'code'),
    controllers.test.testCode
  );

  router.post(
    '/:workspaceID/knowledge-base',
    middlewares.auth.authorize(['workspace:READ']),
    middlewares.auth.verifyParamConsistency((req: Request) => ({
      projectID: req.body.projectID,
      auth: req.headers.authorization,
      versionID: req.body.versionID,
    })),
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'knowledge-base'),
    controllers.test.testKnowledgeBase
  );

  router.post(
    '/:workspaceID/completion',
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'completion'),
    controllers.test.testCompletion
  );

  router.post(
    '/:workspaceID/classification',
    middlewares.auth.authorize(['workspace:READ']),
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'classification'),
    controllers.test.testClassification
  );

  return router;
};
