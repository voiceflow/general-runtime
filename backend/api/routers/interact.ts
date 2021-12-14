import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.get('/state', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.interact.state);

  router.post('/', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.interact.handler);

  router.get('/:versionID/state', middlewares.rateLimit.consume, controllers.interact.state);

  router.post('/:versionID', middlewares.rateLimit.consume, controllers.interact.handler);

  return router;
};
