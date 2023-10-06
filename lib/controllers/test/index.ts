import { Validator } from '@voiceflow/backend-utils';
import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import { KnowledgeBaseSettings } from '@voiceflow/base-types/build/cjs/models/project/knowledgeBase';
import VError from '@voiceflow/verror';
import _merge from 'lodash/merge';

import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { fetchKnowledgeBase, promptSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import { answerSynthesis } from '@/lib/services/runtime/handlers/utils/knowledgeBase/answer';
import { AiRequestActionType, SegmentEventType } from '@/lib/services/runtime/types';
import log from '@/logger';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { QuotaName } from '../../services/billing';
import { AIResponse, fetchPrompt } from '../../services/runtime/handlers/utils/ai';
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

  testSendSegmentEvent = async ({
    req,
    answer,
    startTime,
    settings,
    project,
    action_type,
    isKB,
  }: {
    req: Request;
    answer: AIResponse | null;
    startTime: any;
    settings: KnowledgeBaseSettings;
    project: BaseModels.Project.Model<any, any>;
    action_type: AiRequestActionType;
    isKB: boolean;
  }) => {
    const responseTokens = answer?.answerTokens ?? 0;
    const queryTokens = answer?.queryTokens ?? 0;
    const responseOutput = answer?.output;
    const currentDate = new Date().toISOString().slice(0, 10);

    const properties = {
      KB: isKB,
      action_type,
      source: 'Runtime',
      method: 'Preview',
      runtime: performance.now() - startTime,
      response_tokens: responseTokens,
      response_content: responseOutput,
      total_tokens: queryTokens + responseTokens,
      workspace_id: req.params.workspaceID,
      organization_id: project?.teamID,
      project_id: project?._id,
      project_platform: project?.platform,
      project_type: project?.type,
      prompt_type: settings?.summarization?.mode,
      model: settings?.summarization?.model,
      temperature: settings?.summarization?.temperature,
      max_tokens: settings?.summarization?.maxTokens,
      system_prompt: settings?.summarization?.prompt,
      prompt_tokens: queryTokens,
      prompt_content: req.body.prompt,
      success: !!answer?.output,
      http_return_code: answer?.output ? 200 : 500,
    };

    const analyticsPlatformClient = await this.services.analyticsPlatform.getClient();

    if (analyticsPlatformClient) {
      analyticsPlatformClient.track({
        identity: { userID: project.creatorID },
        name: SegmentEventType.AI_REQUEST,
        properties: { ...properties, last_product_activity: currentDate },
      });
    }
  };

  async testKnowledgeBasePrompt(req: Request) {
    const api = await this.services.dataAPI.get();

    // if DM API key infer project from header
    const project = await api.getProject(req.body.projectID || req.headers.authorization);
    const settings = _merge({}, project.knowledgeBase?.settings, req.body.settings);

    const { prompt } = req.body;
    const startTime = performance.now();

    const answer = await promptSynthesis(project._id, project.teamID, { ...settings.summarization, prompt }, {});

    const segmentSourceInfo = {
      req,
      answer,
      startTime,
      settings,
      project,
      action_type: AiRequestActionType.AI_RESPONSE_STEP,
      isKB: true,
    };

    this.testSendSegmentEvent(segmentSourceInfo);

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

    const api = await this.services.dataAPI.get();
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
    const startTime = performance.now();

    const answer = await answerSynthesis({ question, data, options: settings?.summarization });

    if (!(req.headers.authorization && req.headers.authorization.startsWith('ApiKey '))) {
      const segmentSourceInfo = {
        req,
        answer,
        startTime,
        settings,
        project,
        action_type: AiRequestActionType.KB_PAGE,
        isKB: true,
      };

      this.testSendSegmentEvent(segmentSourceInfo);
    }

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
    req: Request<BaseUtils.ai.AIModelParams & BaseUtils.ai.AIContextParams & { workspaceID: string; identity: object }>
  ) {
    if (typeof req.body.prompt !== 'string') throw new VError('invalid prompt', VError.HTTP_STATUS.BAD_REQUEST);

    const startTime = performance.now();

    const answer = await fetchPrompt(req.body);
    const { output } = answer;

    const segmentSourceInfo = {
      req,
      answer,
      startTime,
      settings: {
        summarization: {
          mode: req.body?.mode,
          model: req.body?.model,
          temperature: req.body?.temperature,
          maxTokens: req.body?.maxTokens,
          prompt: req.body?.prompt,
        },
      },
      project: {},
      action_type:
        req.body.type && req.body.type === 'ai_set'
          ? AiRequestActionType.AI_SET_STEP
          : AiRequestActionType.AI_RESPONSE_STEP,
      isKB: true,
    };
    this.testSendSegmentEvent(segmentSourceInfo);

    if (typeof answer.tokens === 'number' && answer.tokens > 0) {
      await this.services.billing
        .consumeQuota(req.params.workspaceID, QuotaName.OPEN_API_TOKENS, answer.tokens)
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
