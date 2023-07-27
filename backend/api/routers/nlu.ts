import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.get(
    '/inference',
    middlewares.project.resolveVersionAlias,
    middlewares.project.attachProjectID,
    middlewares.rateLimit.versionConsume,
    controllers.nlu.inference
  );

  return router;
};
