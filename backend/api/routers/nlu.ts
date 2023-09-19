import express, { Request } from 'express';

import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get(
    '/project/:projectID/version/:versionID/inference',
    middlewares.project.paramsToLegacyHeader,
    middlewares.project.resolveVersionAlias,
    // we need a resource resolver here because:
    // - we push the resources from params to headers due to legacy middlewares
    // - the version alias works at the header level
    middlewares.auth.authorize(['project:READ'], (req: Request) => [
      { kind: 'project', id: req.headers.projectID },
      { kind: 'version', id: req.headers.versionID },
    ]),
    middlewares.inferenceLimit.consumeResource((req) => req.headers.authorization || req.cookies.auth_vf, 'inference'),
    controllers.nlu.inference
  );

  return router;
};
