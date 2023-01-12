import { BaseModels } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

export const generateOutput = (text: string, project?: BaseModels.Project.Model<any, any>) => {
  // TODO: exclusively use project.type after large scale migration
  const isChat =
    project?.type === VoiceflowConstants.ProjectType.CHAT ||
    project?.platform === VoiceflowConstants.PlatformType.CHATBOT;

  return isChat ? [{ text }] : text;
};
