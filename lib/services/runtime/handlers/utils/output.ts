import { BaseModels } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { inputToString } from '@/lib/services/dialog/utils';

export const generateOutput = (output: string, project?: BaseModels.Project.Model<any, any>, voice?: string) => {
  // TODO: exclusively use project.type after large scale migration
  const isChat =
    project?.type === VoiceflowConstants.ProjectType.CHAT ||
    project?.platform === VoiceflowConstants.PlatformType.CHATBOT;

  // return chat response
  if (isChat) {
    return output
      .trim()
      .split('\n')
      .map((line) => ({ children: [{ text: line }] }));
  }

  // return voice response
  return inputToString({ voice, text: output });
};
