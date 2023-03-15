import Voiceflow from '@voiceflow/api-sdk';
import VError from '@voiceflow/verror';

import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import log from '@/logger';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { AbstractController } from './utils';

const VF_COOKIE = 'auth_vf';

class TestController extends AbstractController {
  // validate API with creator-api
  // TODO: switch to auth in the future
  validate = async (cookies: { [VF_COOKIE]?: string }) => {
    const authorization = cookies[VF_COOKIE];
    if (!authorization) {
      throw new VError('missing auth cookie', VError.HTTP_STATUS.UNAUTHORIZED);
    }
    const client = new Voiceflow({ apiEndpoint: this.config.CREATOR_API_ENDPOINT!, clientKey: '' }).generateClient({
      authorization,
    });

    try {
      await client.fetch.get('/session');
    } catch (error) {
      log.warn(error);
      throw new VError('invalid session', VError.HTTP_STATUS.UNAUTHORIZED);
    }
  };

  async testAPI(req: Request, res: Response) {
    await this.validate(req.cookies);

    const { responseJSON } = await callAPI(req.body.api, getAPIBlockHandlerOptions(this.config));
    if (responseJSON.VF_STATUS_CODE) {
      res.status(responseJSON.VF_STATUS_CODE);
    }
    res.send(responseJSON);
  }

  async testCode(req: Request, res: Response) {
    await this.validate(req.cookies);

    if (typeof req.body.code !== 'string') {
      res.status(400).send({ error: 'code must be a string' });
      return;
    }
    if (typeof req.body.variables !== 'object') {
      res.status(400).send({ error: 'variables must be an object' });
      return;
    }

    try {
      const startTime = performance.now();
      const variables = await ivmExecute({ code: req.body.code, variables: req.body.variables });
      res.send({ variables, time: performance.now() - startTime });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  }
}

export default TestController;
