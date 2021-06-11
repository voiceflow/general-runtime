import bodyParser from '@voiceflow/body-parser';
import express from 'express';
import sjson from 'secure-json-parse';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT, customJSONParser: sjson.parse }));
  router.use(middlewares.rateLimit.verify);

  router.get('/:versionID/state', middlewares.rateLimit.consume, controllers.interact.state);

  router.post('/:versionID', middlewares.rateLimit.consume, controllers.interact.handler);

  return router;
};
