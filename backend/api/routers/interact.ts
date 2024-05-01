import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

// stateless API routes
export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  const interactMiddleware = [middlewares.project.resolveVersionAlias, middlewares.rateLimit.versionConsume];

  const legacyMiddleware = [middlewares.project.unifyVersionID, ...interactMiddleware];

  router.get('/state', interactMiddleware, controllers.interact.state);
  router.post('/', interactMiddleware, controllers.interact.handler as any);

  // Legacy 1.0.0 routes with versionID in params
  router.get('/:versionID/state', legacyMiddleware, controllers.interact.state);
  router.post('/:versionID', legacyMiddleware, controllers.interact.handler as any);

  return router;
};
