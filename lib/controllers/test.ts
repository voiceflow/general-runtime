import { BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import _merge from 'lodash/merge';

import AI from '@/lib/clients/ai';
import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { fetchKnowledgeBase, promptSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import { answerSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase/answer';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { fetchPrompt } from '../services/runtime/handlers/utils/ai';
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

  async testKnowledgeBase(req: Request) {
    const api = await this.services.dataAPI.get(req.headers.authorization);

    // if DM API key infer project from header
    const project = await api.getProject(req.body.projectID || req.headers.authorization);
    const settings = _merge({}, project.knowledgeBase?.settings, req.body.settings);

    const { question, synthesis = true } = req.body;

    const data = await fetchKnowledgeBase(project._id, question, settings);

    if (!data) return { output: null, chunks: [] };

    // attach metadata to chunks
    const chunks = data.chunks.map((chunk) => ({
      ...chunk,
      source: project.knowledgeBase?.documents?.[chunk.documentID]?.data,
    }));

    if (!synthesis) return { output: null, chunks };

    const answer = await answerSynthesis({ question, data, options: settings?.summarization });

    if (!answer?.output) return { output: null, chunks };

    return { output: answer.output, chunks };
  }

  async testCompletion(req: Request<BaseUtils.ai.AIModelParams & BaseUtils.ai.AIContextParams>) {
    const ai = AI.get(req.body.model);

    if (!ai) throw new VError('invalid model', VError.HTTP_STATUS.BAD_REQUEST);
    if (typeof req.body.prompt !== 'string') throw new VError('invalid prompt', VError.HTTP_STATUS.BAD_REQUEST);

    const { output } = await fetchPrompt(req.body);

    return { output };
  }
}

export default TestController;
