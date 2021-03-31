import bodyParser from 'body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post('/:versionID/user/:userID/interact', middlewares.rateLimit.consume, controllers.stateManagement.interact);

  router.get('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.version.hasPermission, controllers.stateManagement.get);

  router.put('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.version.hasPermission, controllers.stateManagement.update);

  router.delete('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.version.hasPermission, controllers.stateManagement.delete);

  router.post('/:versionID/user/:userID', middlewares.rateLimit.consume, controllers.stateManagement.reset);

  return router;
};
