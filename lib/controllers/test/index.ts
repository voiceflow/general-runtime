import { Validator } from '@voiceflow/backend-utils';
import { BaseModels, BaseUtils } from '@voiceflow/base-types';
import { BadRequestException } from '@voiceflow/exception';
import VError from '@voiceflow/verror';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { z } from 'zod';

import { Predictor } from '@/lib/services/classification';
import { castToDTO } from '@/lib/services/classification/classification.utils';
import { getAPIBlockHandlerOptions } from '@/lib/services/runtime/handlers/api';
import { callAPI } from '@/runtime/lib/Handlers/api/utils';
import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';
import { Request, Response, VersionTag } from '@/types';
import { formatZodError } from '@/utils/zod-error/formatZodError';

import { fetchPrompt } from '../../services/runtime/handlers/utils/ai';
import { validate } from '../../utils';
import { AbstractController } from '../utils';
import {
  TestClassificationRequestBodyDTO,
  TestClassificationResponse,
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
      const variables = await ivmExecute({
        code: req.body.code,
        variables: req.body.variables,
      });
      res.send({ variables, time: performance.now() - startTime });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
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

    return this.services.aiSynthesis
      .knowledgeBaseQuery({
        project,
        version,
        question,
        synthesis,
        instruction,
        options: { search: { limit: chunkLimit }, summarization: settings },
        tags,
      })
      .catch((err) => {
        if (err?.message?.includes('Quota exceeded')) {
          throw new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
        }
        throw err;
      });
  }

  async testCompletion(
    req: Request<
      BaseUtils.ai.AIModelParams &
        BaseUtils.ai.AIContextParams & {
          workspaceID: string;
        }
    >
  ) {
    if (typeof req.body.prompt !== 'string') {
      throw new VError('invalid prompt', VError.HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const { output } = await fetchPrompt(
        req.body,
        this.services.mlGateway,
        { context: { workspaceID: req.params.workspaceID } },
        {}
      );
      return { output };
    } catch (err) {
      if (err?.message?.includes('Quota exceeded')) {
        throw new VError('Quota exceeded', VError.HTTP_STATUS.PAYMENT_REQUIRED);
      }
      throw err;
    }
  }

  async testClassification(req: Request): Promise<TestClassificationResponse> {
    const data = TestClassificationRequestBodyDTO.parse(req.body);

    const api = await this.services.dataAPI.get();

    const version = await api.getVersion(data.versionID);
    const project = await api.getProject(version.projectID);
    const { intents, slots } = castToDTO(version, project);

    // extra intents has the set of capture intents we want to exclude
    const extraIntentNames = new Set(version.prototype?.surveyorContext.extraIntents.map(({ name }) => name));

    const predictor = new Predictor(
      {
        axios: this.services.axios,
        mlGateway: this.services.mlGateway,
        CLOUD_ENV: this.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_HOST: this.config.NLU_GATEWAY_SERVICE_HOST,
        NLU_GATEWAY_SERVICE_PORT_APP: this.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project.teamID,
        versionID: data.versionID,
        tag: project.liveVersion === data.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
        intents: intents ?? [],
        slots,
      },
      data.intentClassificationSettings,
      {
        locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
        filteredIntents: Array.from(extraIntentNames),
      }
    );
    await predictor.predict(data.utterance);

    const { predictions } = predictor;

    const nluIntents = (() => {
      if (predictions.nlu?.intents) {
        return predictions.nlu.intents;
      }

      if (predictions.nlc?.predictedIntent) {
        return [
          {
            name: predictions.nlc.predictedIntent,
            confidence: predictions.nlc.confidence ?? 1,
          },
        ];
      }

      return [];
    })();

    return {
      utterance: predictions.utterance ?? data.utterance,
      nlu: {
        // Filter out capture intents
        intents: nluIntents.filter(({ name }) => !extraIntentNames.has(name)),
      },
      llm: {
        intents:
          predictions.llm && predictions.llm.predictedIntent && predictions.llm.confidence
            ? [
                {
                  name: predictions.llm.predictedIntent,
                  confidence: predictions.llm.confidence,
                },
              ]
            : [],
      },
    };
  }

  async testFunction(req: Request<Record<string, never>, TestFunctionRequestBody>): Promise<TestFunctionResponse> {
    try {
      await TestFunctionRequestBodyDTO.parseAsync(req.body);
    } catch (err) {
      throw new BadRequestException({
        message: err instanceof z.ZodError ? formatZodError(err) : err.message,
      });
    }

    const { definition, invocation } = req.body;

    const result = await this.services.test.testFunction(definition.code, definition, invocation);

    return TestFunctionResponseDTO.parse(result);
  }
}

export default TestController;
