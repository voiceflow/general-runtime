import bodyParser from '@voiceflow/body-parser';
import express from 'express';

import { BODY_PARSER_SIZE_LIMIT } from '@/backend/constants';
import CONFIG from '@/config';
import { MiddlewareMap } from '@/lib';
import { createResponseConfig } from '@/lib/utils';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';

export default (middlewares: MiddlewareMap) => {
  const router = express.Router();

  router.use(bodyParser.json({ limit: BODY_PARSER_SIZE_LIMIT }));
  router.use(middlewares.rateLimit.verify);

  router.post('/', async (req, res) => {
    const { responseJSON } = await callAPI(req.body.api, createResponseConfig(CONFIG));
    if (responseJSON.VF_STATUS_CODE) {
      res.status(responseJSON.VF_STATUS_CODE);
    }
    res.send(responseJSON);
  });

  return router;
};
