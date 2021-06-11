import bodyParser from '@voiceflow/body-parser';
import express from 'express';
import sjson from 'secure-json-parse';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT, customJSONParser: sjson.parse }));
  router.use(middlewares.rateLimit.verify);

  router.post('/:versionID/user/:userID/interact', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.stateManagement.interact);

  router.get('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.stateManagement.get);

  router.put('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.stateManagement.update);

  router.delete('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.stateManagement.delete);

  router.post('/:versionID/user/:userID', middlewares.rateLimit.consume, middlewares.project.attachID, controllers.stateManagement.reset);

  router.patch(
    '/:versionID/user/:userID/variables',
    middlewares.rateLimit.consume,
    middlewares.project.attachID,
    controllers.stateManagement.updateVariables
  );

  return router;
};
