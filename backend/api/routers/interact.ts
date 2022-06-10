import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  const commonMiddleware = [middlewares.rateLimit.versionConsume];
  const interactMiddleware = [middlewares.project.resolveVersionAlias, ...commonMiddleware];
  const legacyMiddleware = [
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAliasLegacy,
    ...commonMiddleware,
  ];

  router.get('/state', interactMiddleware, controllers.interact.state);
  router.post('/', interactMiddleware, controllers.interact.handler);

  // Legacy 1.0.0 routes with versionID in params
  router.get('/:versionID/state', legacyMiddleware, controllers.interact.state);
  router.post('/:versionID', legacyMiddleware, controllers.interact.handler);

  return router;
};
