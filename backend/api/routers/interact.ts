import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.get('/state', middlewares.rateLimit.versionConsume, middlewares.project.attachID, controllers.interact.state);

  router.post('/', middlewares.rateLimit.versionConsume, middlewares.project.attachID, controllers.interact.handler);

  // Legacy 1.0.0 routes with versionID in params
  router.use(middlewares.project.unifyVersionID);

  router.get('/:versionID/state', middlewares.rateLimit.versionConsume, controllers.interact.state);

  router.post('/:versionID', middlewares.rateLimit.versionConsume, controllers.interact.handler);

  return router;
};
