import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post(
    '/:projectID/:tag/stream',
    middlewares.auth.authorize(['project:READ', 'project.versions:READ']),
    middlewares.project.getProjectEnvironment,
    controllers.interact.stream as any
  );

  return router;
};
