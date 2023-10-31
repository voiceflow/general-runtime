import express from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get(
    '/project/:projectID/version/:versionID/inference',
    middlewares.auth.authorize(['project:READ']),
    middlewares.project.paramsToLegacyHeader,
    middlewares.project.resolveVersionAlias,
    middlewares.rateLimit.versionConsume,
    controllers.nlu.inference
  );

  return router;
};
