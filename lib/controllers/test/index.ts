import { Validator } from '@voiceflow/backend-utils';
import { BaseUtils } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import _merge from 'lodash/merge';

import AI from '@/lib/clients/ai';
import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { fetchKnowledgeBase, promptSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import { answerSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase/answer';
import log from '@/logger';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { QuotaName } from '../../services/billing';
import { fetchPrompt } from '../../services/runtime/handlers/utils/ai';
import { validate } from '../../utils';
import { AbstractController } from '../utils';
import { TestFunctionBody, TestFunctionParams, TestFunctionResponse, TestFunctionStatus } from './interface';

const { body } = Validator;

const VALIDATIONS = {
  BODY: {
    CHUNK_LIMIT: body('chunkLimit').optional().isInt({ min: 1, max: 10 }),
    QUESTION: body('question').exists().isString(),
    SYNTHESIS: body('synthesis').optional().isBoolean(),
  },
};

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

  async testKnowledgeBasePrompt(req: Request) {
    const api = await this.services.dataAPI.get(req.headers.authorization);

    // if DM API key infer project from header
    const project = await api.getProject(req.body.projectID || req.headers.authorization);
    const settings = _merge({}, project.knowledgeBase?.settings, req.body.settings);

    const { prompt } = req.body;

    const answer = await promptSynthesis(project._id, project.teamID, { ...settings.summarization, prompt }, {});

    if (!answer?.output) return { output: null };

    if (typeof answer.tokens === 'number' && answer.tokens > 0) {
      await this.services.billing
        .consumeQuota(req.params.workspaceID, QuotaName.OPEN_API_TOKENS, answer.tokens)
        .catch((err: Error) =>
          log.warn(
            `[KB Prompt Test] Error consuming quota for workspace ${req.params.workspaceID}: ${log.vars({ err })}`
          )
        );
    }

    return { output: answer.output };
  }

  @validate({
    BODY_CHUNK_LIMIT: VALIDATIONS.BODY.CHUNK_LIMIT,
    BODY_QUESTION: VALIDATIONS.BODY.QUESTION,
    BODY_SYNTHESIS: VALIDATIONS.BODY.SYNTHESIS,
  })
  async testKnowledgeBase(
    req: Request<any, { projectID?: string; question: string; synthesis?: boolean; chunkLimit?: number }>
  ) {
    const { question, synthesis = true, chunkLimit } = req.body;

    const api = await this.services.dataAPI.get(req.headers.authorization);
    // if DM API key infer project from header
    const project = await api.getProject(req.body.projectID || req.headers.authorization!);

    if (!(await this.services.billing.checkQuota(project.teamID, QuotaName.OPEN_API_TOKENS))) {
      throw new VError('token quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
    }

    const settings = _merge({}, project.knowledgeBase?.settings, { search: { limit: chunkLimit } });

    const data = await fetchKnowledgeBase(project._id, project.teamID, question, settings);

    if (!data) return { output: null, chunks: [] };

    // attach metadata to chunks
    const chunks = data.chunks.map((chunk) => ({
      ...chunk,
      source: project.knowledgeBase?.documents?.[chunk.documentID]?.data,
    }));

    if (!synthesis) return { output: null, chunks };

    const answer = await answerSynthesis({ question, data, options: settings?.summarization });

    if (!answer?.output) return { output: null, chunks };

    // do this async to not block the response
    if (typeof answer.tokens === 'number' && answer.tokens > 0) {
      this.services.billing
        .consumeQuota(project.teamID, QuotaName.OPEN_API_TOKENS, answer.tokens)
        .catch((err: Error) =>
          log.warn(`[KB Test] Error consuming quota for workspace ${project.teamID}: ${log.vars({ err })}`)
        );
    }

    return {
      output: answer.output,
      chunks,
      queryTokens: answer.queryTokens,
      answerTokens: answer.answerTokens,
      totalTokens: answer.tokens,
    };
  }

  async testCompletion(
    req: Request<BaseUtils.ai.AIModelParams & BaseUtils.ai.AIContextParams & { workspaceID: string }>
  ) {
    const ai = AI.get(req.body.model);

    if (!ai) throw new VError('invalid model', VError.HTTP_STATUS.BAD_REQUEST);
    if (typeof req.body.prompt !== 'string') throw new VError('invalid prompt', VError.HTTP_STATUS.BAD_REQUEST);

    const { output, tokens } = await fetchPrompt(req.body);

    if (typeof tokens === 'number' && tokens > 0) {
      await this.services.billing
        .consumeQuota(req.params.workspaceID, QuotaName.OPEN_API_TOKENS, tokens)
        .catch((err: Error) =>
          log.warn(
            `[Completion Test] Error consuming quota for workspace ${req.params.workspaceID}: ${log.vars({ err })}`
          )
        );
    }

    return { output };
  }

  async testFunction(req: Request<TestFunctionParams, TestFunctionBody>): Promise<TestFunctionResponse> {
    const {
      params: { functionID },
      body: inputMapping,
    } = req;

    await this.services.test.testFunction(functionID, inputMapping);

    return {
      status: TestFunctionStatus.Success,
      latencyMS: 483,
      outputMapping: {
        str_value: 'hello, world!',
        num_value: 123456.789,
        bool_value: true,
        arr_value: ['a', 'b', 'c', ['1', '2', '3'], { a: '1', b: 2, c: false }],
        obj_value: {
          x: 1,
          y: 'string',
          z: true,
          w: [1, '2', false, [1, 2, 3], { a: 1 }],
          v: {
            '1': 1,
            2: 2,
            '3': false,
          },
        },
      },
    };
  }
}

export default TestController;
