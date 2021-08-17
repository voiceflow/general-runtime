import { Node } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';
import { Types } from '@voiceflow/voice-types';

import { Frame, Program } from '@/runtime';

export const RESUME_PROGRAM_ID = '__RESUME_FLOW__';

export enum ResumeVariables {
  VOICE = '__voice0__',
  CONTENT = '__content0__',
  FOLLOW_VOICE = '__voice1__',
  FOLLOW_CONTENT = '__content1__',
}

export const promptToSSML = (content = '', voice: string | undefined) => {
  if (!voice || voice === 'Alexa' || !content) {
    return content;
  }
  if (voice === 'audio') {
    return `<audio src="${content}"/>`;
  }
  return `<voice name="${voice}">${content}</voice>`;
};

export const createResumeFrame = (resume: Types.Prompt<Constants.Voice>, follow: Types.Prompt<Constants.Voice> | null) => {
  return new Frame({
    programID: RESUME_PROGRAM_ID,
    variables: {
      [ResumeVariables.CONTENT]: promptToSSML(resume.content, resume.voice),
      [ResumeVariables.FOLLOW_CONTENT]: follow ? promptToSSML(follow.content, follow.voice) : '',
    },
  });
};

const ResumeDiagramRaw = {
  id: RESUME_PROGRAM_ID,
  name: 'Voiceflow Resume',
  lines: {
    1: {
      id: '1',
      type: Node.NodeType.SPEAK,
      speak: `{${ResumeVariables.CONTENT}}`,
      nextId: '2',
    },
    2: {
      id: '2',
      type: Node.NodeType.INTERACTION,
      interactions: [
        {
          intent: Constants.IntentName.YES,
          mappings: [],
        },
        {
          intent: Constants.IntentName.NO,
          mappings: [],
        },
      ],
      nextIds: ['3', '4'],
      elseId: '3',
    },
    3: {
      type: Node.NodeType.SPEAK,
      id: '3',
      speak: `{${ResumeVariables.FOLLOW_CONTENT}}`,
    },
    4: {
      type: 'reset',
      id: '4',
      reset: true,
    },
  },
  startId: '1',
};

export const ResumeDiagram = new Program(ResumeDiagramRaw);
