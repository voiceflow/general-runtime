import { BaseUtils } from '@voiceflow/base-types';
import { Slot } from '@voiceflow/base-types/build/cjs/models';
import { GPT_MODEL, Message } from '@voiceflow/base-types/build/cjs/utils/ai';
import { SlotType } from '@voiceflow/voiceflow-types/build/cjs/constants';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import { PromptWrapper } from '@/lib/services/extraction/prompt-wrapper/prompt-wrapper.class';
import {
  PromptWrapperExtractionResult,
  PromptWrapperModelParams,
} from '@/lib/services/extraction/prompt-wrapper/prompt-wrapper.interface';

chai.use(chaiAsPromised);
const { expect } = chai;

/**
 * Fake Data
 */
const llmParams: PromptWrapperModelParams = {
  model: GPT_MODEL.GPT_4o,
  temperature: 0.7,
  system: 'system',
  maxTokens: 1337,
};

// const transcript = runtime.variables.getState()[State.Key]
const transcript: Message[] = [
  {
    role: BaseUtils.ai.Role.SYSTEM,
    content: 'what is your name?',
  },
  {
    role: BaseUtils.ai.Role.USER,
    content: 'my name is Tom',
  },
];

const generateChatCompletionResponse = {
  output:
    "Rationale: The user has provided their email address, but no information about name or any other entity specified in the rules. We need to ask for the missing information to fulfill the requirements.\n\nEntity State: {'email': 'tom@bomb.com', 'name_a': null, 'name_b': null}\n\nType: reprompt\n\nResponse: Thank you for providing your email address. Could you please provide your full name including first and last name?",
  tokens: 7992,
  queryTokens: 7452,
  answerTokens: 540,
  model: 'gpt-4o',
  multiplier: 6,
};

const mlGateway = {
  private: {
    completion: {
      generateCompletion: sinon.stub().resolves({ test: 'beans' }),
      generateChatCompletion: sinon.stub().resolves(generateChatCompletionResponse),
    },
  },
};

const slots: Slot[] = [
  {
    key: 'slot-key',
    name: 'slot-name',
    type: {
      value: SlotType.EMAIL,
    },
    inputs: ['input'],
  },
];

const rules = ['name must be a full name'];

const exitScenarios = ['exit if the email is over 100 characters'];

const projectID = 'project-id';
const workspaceID = 'workspace-id';

describe('prompt wrapper unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('works', async () => {
    const utterance = 'query-val';

    const expectedResult: PromptWrapperExtractionResult = {
      type: 'reprompt',
      entityState: {
        email: 'tom@bomb.com',
        name_a: null,
        name_b: null,
      },
      rationale:
        'The user has provided their email address, but no information about name or any other entity specified in the rules. We need to ask for the missing information to fulfill the requirements.',
      response:
        'Thank you for providing your email address. Could you please provide your full name including first and last name?',
    };

    const expectedSideEffects = {
      tokens: 7992,
      answerTokens: 540,
      queryTokens: 7452,
      multiplier: 6,
    };

    const promptWrapper = new PromptWrapper(mlGateway)
      .withModelParams(llmParams)
      .withTranscripts(transcript)
      .withUtterance(utterance)
      .withContext({
        projectID,
        workspaceID,
      })
      .withSlots(slots)
      .withRules(rules)
      .withExitScenarios(exitScenarios);

    const [result, sideEffects] = await promptWrapper.exec();

    expect(result).to.eql(expectedResult);
    expect(sideEffects).to.eql(expectedSideEffects);
  });
});
