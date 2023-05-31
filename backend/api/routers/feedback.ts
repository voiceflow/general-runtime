import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  const feedbackMiddleware = [middlewares.project.resolvePublicProjectID, middlewares.rateLimit.versionConsume];

  // full route: feedback/:projectID/user/:userID/feedback
  router.post('/:projectID/user/:userID', feedbackMiddleware, controllers.feedback.handler);

  return router;
};
