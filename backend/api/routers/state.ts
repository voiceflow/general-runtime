import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post(
    '/user/:userID/interact',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.interact
  );

  router.get(
    '/user/:userID',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.get
  );

  router.put(
    '/user/:userID',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.update
  );

  router.delete(
    '/user/:userID',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.delete
  );

  router.post(
    '/user/:userID',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.reset
  );

  router.patch(
    '/user/:userID/variables',
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.updateVariables
  );

  // Legacy 1.0.0 routes with versionID in params
  router.post(
    '/:versionID/user/:userID/interact',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.interact
  );

  router.get(
    '/:versionID/user/:userID',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.get
  );

  router.put(
    '/:versionID/user/:userID',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.update
  );

  router.delete(
    '/:versionID/user/:userID',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.delete
  );

  router.post(
    '/:versionID/user/:userID',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.reset
  );

  router.patch(
    '/:versionID/user/:userID/variables',
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.stateManagement.updateVariables
  );

  return router;
};
