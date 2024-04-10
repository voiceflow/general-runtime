import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import { ControllerMap, MiddlewareMap } from '@/lib';

export default (middlewares: MiddlewareMap, controllers: ControllerMap) => {
  const router = express.Router();

  router.use(middlewares.project.checkPublicAccessControlOrigin);

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));

  const interactMiddleware = [
    middlewares.project.resolvePublicProjectID,
    middlewares.rateLimit.versionConsume,
  ];

  // full route: /public/:projectID/state/user/:userID/interact
  router.post(
    '/:projectID/state/user/:userID/interact',
    interactMiddleware,
    controllers.public.interact
  );

  router.post(
    '/:projectID/transcripts',
    interactMiddleware,
    controllers.transcript.upsertTranscript
  );

  router.get('/:projectID/publishing', interactMiddleware, controllers.public.getPublishing);

  return router;
};
