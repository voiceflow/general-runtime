import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  const commonMiddleware = [middlewares.rateLimit.versionConsume, middlewares.project.attachProjectID];
  const stateMiddleware = [middlewares.project.resolveVersionAlias, ...commonMiddleware];
  const legacyMiddleware = [
    middlewares.project.unifyVersionID,
    middlewares.project.resolveVersionAliasLegacy,
    ...commonMiddleware,
  ];

  router.post('/user/:userID/interact', stateMiddleware, controllers.stateManagement.interact);
  router.get('/user/:userID', stateMiddleware, controllers.stateManagement.get);
  router.put('/user/:userID', stateMiddleware, controllers.stateManagement.update);
  router.delete('/user/:userID', stateMiddleware, controllers.stateManagement.delete);
  router.post('/user/:userID', stateMiddleware, controllers.stateManagement.reset);
  router.patch('/user/:userID/variables', stateMiddleware, controllers.stateManagement.updateVariables);

  // Legacy 1.0.0 routes with versionID in params
  router.post('/:versionID/user/:userID/interact', legacyMiddleware, controllers.stateManagement.interact);
  router.get('/:versionID/user/:userID', legacyMiddleware, controllers.stateManagement.get);
  router.put('/:versionID/user/:userID', legacyMiddleware, controllers.stateManagement.update);
  router.delete('/:versionID/user/:userID', legacyMiddleware, controllers.stateManagement.delete);
  router.post('/:versionID/user/:userID', legacyMiddleware, controllers.stateManagement.reset);
  router.patch('/:versionID/user/:userID/variables', legacyMiddleware, controllers.stateManagement.updateVariables);

  return router;
};
