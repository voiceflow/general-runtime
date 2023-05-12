import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { fetchKnowledgeBase } from '@/lib/services/runtime/handlers/utils/knowledgeBaseNoMatch';
import { answerSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBaseNoMatch/answer';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { AbstractController } from './utils';

class TestController extends AbstractController {
  async testAPI(req: Request, res: Response) {
    const { responseJSON } = await callAPI(req.body.api, getAPIBlockHandlerOptions(this.config));
    if (responseJSON.VF_STATUS_CODE) {
      res.status(responseJSON.VF_STATUS_CODE);
    }
    res.send(responseJSON);
  }

  async testCode(req: Request, res: Response) {
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

  async testKnowledgeBase(req: Request, res: Response) {
    const { projectID, question, settings } = req.body;

    const data = await fetchKnowledgeBase(projectID, question, settings);

    if (!data) return res.send({ output: null, chunks: [] });

    const answer = await answerSynthesis({ question, data, options: settings?.summarization });

    if (!answer?.output) return res.send({ ...answer, output: null, chunks: data.chunks });

    return res.send({ ...answer, chunks: data.chunks });
  }
}

export default TestController;
