import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';
import { QuotaName } from '@/lib/services/billing';
import { Request } from '@/types';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post(
    '/workspaces/:workspaceID/functions',
    middlewares.auth.authorize(['workspace:READ']),
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
    middlewares.billing.checkQuota(QuotaName.OPEN_API_TOKENS, (req) => req.params.workspaceID),
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'knowledge-base'),
    controllers.test.testKnowledgeBase
  );

  router.post(
    '/:workspaceID/knowledge-base-prompt',
    middlewares.auth.authorize(['workspace:READ']),
    // eslint-disable-next-line sonarjs/no-identical-functions
    middlewares.auth.verifyParamConsistency((req: Request) => ({
      projectID: req.body.projectID,
      auth: req.headers.authorization,
      versionID: req.body.versionID,
    })),
    middlewares.billing.checkQuota(QuotaName.OPEN_API_TOKENS, (req) => req.params.workspaceID),
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'knowledge-base'),
    controllers.test.testKnowledgeBasePrompt
  );

  router.post(
    '/:workspaceID/completion',
    middlewares.auth.authorize(['workspace:READ']),
    middlewares.billing.checkQuota(QuotaName.OPEN_API_TOKENS, (req) => req.params.workspaceID),
    middlewares.llmLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'completion'),
    controllers.test.testCompletion
  );

  return router;
};
