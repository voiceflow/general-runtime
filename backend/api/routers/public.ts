import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  router.use([middlewares.project.resolvePublicProjectID, middlewares.rateLimit.versionConsume]);

  // full route: /public/:projectID/state/user/:userID/interact
  router.post('/:projectID/state/user/:userID/interact', controllers.stateManagement.publicInteract);

  router.get('/:projectID/publishing', controllers.stateManagement.getPublicPublishing);

  return router;
};
