import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

// stateful API routes
export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(express.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  const middleware = [
    middlewares.project.resolveVersionAlias,
    middlewares.project.attachProjectID,
    middlewares.rateLimit.versionConsume,
  ];

  router.post('/:projectID', middleware, controllers.transcript.upsertTranscript);

  return router;
};
