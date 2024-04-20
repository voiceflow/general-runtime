import { BaseModels } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

export const inputToString = ({ text, voice }: BaseModels.IntentInput, defaultVoice?: string | null) => {
  const currentVoice = voice || defaultVoice;

  return currentVoice?.trim() ? `<voice name="${currentVoice}">${text}</voice>` : text;
};

// TODO: exclusively use project.type after large scale migration
export const isChatProject = (project?: BaseModels.Project.Model<any, any>) =>
  project?.type === VoiceflowConstants.ProjectType.CHAT ||
  project?.platform === VoiceflowConstants.PlatformType.CHATBOT;

export const generateOutput = (output: string, project?: BaseModels.Project.Model<any, any>, voice?: string) => {
  // return chat response
  if (isChatProject(project)) {
    return output
      .trim()
      .split('\n')
      .map((line) => ({ children: [{ text: line }] }));
  }

  // return voice response
  return inputToString({
    // "Alexa" is not a valid value for the voice attribute on Alexa projects, remove it
    voice: project?.platform === VoiceflowConstants.PlatformType.ALEXA && voice === 'Alexa' ? '' : voice,
    text: output,
  });
};
