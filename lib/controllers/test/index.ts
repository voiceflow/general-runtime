import { Validator } from '@voiceflow/backend-utils';
import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import { BadRequestException } from '@voiceflow/exception';
import VError from '@voiceflow/verror';
import _merge from 'lodash/merge';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { getKBSettings } from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import log from '@/logger';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response } from '@/types';

import { QuotaName } from '../../services/billing';
import { fetchPrompt } from '../../services/runtime/handlers/utils/ai';
import { validate } from '../../utils';
import { AbstractController } from '../utils';
import {
  TestFunctionRequestBody,
  TestFunctionRequestBodyDTO,
  TestFunctionResponse,
  TestFunctionResponseDTO,
} from './interface';

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
    const api = await this.services.dataAPI.get();

    // if DM API key infer project from header
    const project = await api.getProject(req.headers.authorization || req.body.projectID);
    const version = req.body.versionID ? await api.getVersion(req.body.versionID) : null;

    const globalKBSettings = getKBSettings(
      this.services.unleash,
      project.teamID,
      version?.knowledgeBase?.settings,
      project.knowledgeBase?.settings
    );
    const settings = _merge({}, globalKBSettings, req.body.settings);

    const { prompt } = req.body;

    const answer = await this.services.aiSynthesis.DEPRECATEDpromptSynthesis(
      project._id,
      project.teamID,
      { ...settings.summarization, prompt },
      {}
    );

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
    req: Request<
      any,
      {
        versionID?: string;
        projectID?: string;
        question: string;
        instruction?: string;
        synthesis?: boolean;
        chunkLimit?: number;
        settings?: Partial<BaseUtils.ai.AIModelParams>;
        tags?: BaseModels.Project.KnowledgeBaseTagsFilter;
      }
    >
  ) {
    const { question, instruction, synthesis, chunkLimit, settings, tags } = req.body;

    const api = await this.services.dataAPI.get();
    // if DM API key infer project from header
    const project = await api.getProject(req.headers.authorization || req.body.projectID!);

    let version = null;
    if (req.body.versionID) {
      version = await api.getVersion(req.body.versionID);
    } else if (project.devVersion) {
      version = await api.getVersion(project.devVersion);
    }

    const answer = await this.services.aiSynthesis.knowledgeBaseQuery({
      project,
      version,
      question,
      synthesis,
      instruction,
      options: { search: { limit: chunkLimit }, summarization: settings },
      tags,
    });

    // do this async to not block the response
    if (typeof answer.tokens === 'number' && answer.tokens > 0) {
      this.services.billing
        .consumeQuota(project.teamID, QuotaName.OPEN_API_TOKENS, answer.tokens)
        .catch((err: Error) =>
          log.warn(`[KB Test] Error consuming quota for workspace ${project.teamID}: ${log.vars({ err })}`)
        );
    }

    return answer;
  }

  async testCompletion(
    req: Request<BaseUtils.ai.AIModelParams & BaseUtils.ai.AIContextParams & { workspaceID: string }>
  ) {
    const model = this.services.ai.get(req.body.model);

    if (!model) throw new VError('invalid model', VError.HTTP_STATUS.BAD_REQUEST);
    if (typeof req.body.prompt !== 'string') throw new VError('invalid prompt', VError.HTTP_STATUS.BAD_REQUEST);

    const { output, tokens } = await fetchPrompt(
      req.body,
      model,
      { context: { workspaceID: req.params.workspaceID } },
      {}
    );

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

  async testFunction(req: Request<Record<string, never>, TestFunctionRequestBody>): Promise<TestFunctionResponse> {
    try {
      await TestFunctionRequestBodyDTO.parseAsync(req.body);
    } catch (err) {
      throw new BadRequestException(
        err instanceof z.ZodError ? fromZodError(err).message : 'Unknown error occurred when parsing request'
      );
    }

    const { functionDefinition, inputMapping } = req.body;

    const result = await this.services.test.testFunction(functionDefinition, inputMapping);

    return TestFunctionResponseDTO.parse(result);
  }
}

export default TestController;
