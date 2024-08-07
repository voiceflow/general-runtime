import { BaseRequest } from '@voiceflow/base-types';
import { WithCompiledExitScenario } from '@voiceflow/dtos';

import { Runtime } from '@/runtime';

import { PromptWrapperExtractionResultType } from '../../extraction/prompt-wrapper/prompt-wrapper.dto';

type ExitScenarioNode = BaseRequest.NodeButton & WithCompiledExitScenario;

export const ExitScenarioHandler = () => ({
  canHandle: (runtime: Runtime) => runtime.getRequest()?.type === PromptWrapperExtractionResultType.enum.exit,
  handle: (node: ExitScenarioNode) => {
    return node.exitScenario?.nextStepID ?? null;
  },
});

export default () => ExitScenarioHandler();
