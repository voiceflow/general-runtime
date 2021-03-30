import bodyParser from 'body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post('state/:versionID/user/:userID/interact', middlewares.rateLimit.consume, controllers.stateManagement.interact);

  router.get('state/:versionID/user/:userID', middlewares.rateLimit.consume, controllers.stateManagement.get);

  router.put('state/:versionID/user/:userID', middlewares.rateLimit.consume, controllers.stateManagement.update);

  router.post('state/:versionID/user/:userID', middlewares.rateLimit.consume, controllers.stateManagement.reset);

  return router;
};
