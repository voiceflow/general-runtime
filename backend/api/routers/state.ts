import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

// stateful API routes
export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  const statefulAPIMiddleware = [
    middlewares.project.resolveVersionAlias,
    middlewares.project.attachProjectID,
    middlewares.rateLimit.versionConsume,
  ];

  const legacyAPIMiddleware = [middlewares.project.unifyVersionID, ...statefulAPIMiddleware];

  router.post(
    '/user/:userID/interact',
    statefulAPIMiddleware,
    controllers.stateManagement.interact
  );
  router.get('/user/:userID', statefulAPIMiddleware, controllers.stateManagement.get);
  router.put('/user/:userID', statefulAPIMiddleware, controllers.stateManagement.update);
  router.delete('/user/:userID', statefulAPIMiddleware, controllers.stateManagement.delete);
  router.post('/user/:userID', statefulAPIMiddleware, controllers.stateManagement.reset);
  router.patch(
    '/user/:userID/variables',
    statefulAPIMiddleware,
    controllers.stateManagement.updateVariables
  );

  // Legacy 1.0.0 routes with versionID in params
  router.post(
    '/:versionID/user/:userID/interact',
    legacyAPIMiddleware,
    controllers.stateManagement.interact
  );
  router.get('/:versionID/user/:userID', legacyAPIMiddleware, controllers.stateManagement.get);
  router.put('/:versionID/user/:userID', legacyAPIMiddleware, controllers.stateManagement.update);
  router.delete(
    '/:versionID/user/:userID',
    legacyAPIMiddleware,
    controllers.stateManagement.delete
  );
  router.post('/:versionID/user/:userID', legacyAPIMiddleware, controllers.stateManagement.reset);
  router.patch(
    '/:versionID/user/:userID/variables',
    legacyAPIMiddleware,
    controllers.stateManagement.updateVariables
  );

  return router;
};
