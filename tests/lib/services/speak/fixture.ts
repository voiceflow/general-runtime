import { BaseNode } from '@voiceflow/base-types';

import { Context, PartialContext } from '@/runtime';

export const audioUrl = 'http://localhost:8000/audio.local/1613583846532-mixaund-tech-corporate.mp3';

export const audioMsg = `<audio src="${audioUrl}"/>`;

export const malformedTrace1 = {
  type: BaseNode.Utils.TraceType.SPEAK,
  payload: {
    message: audioMsg,
  },
} as BaseNode.Speak.TraceFrame;

export const malformedTrace2 = {
  type: BaseNode.Utils.TraceType.SPEAK,
  payload: {
    message: '',
  },
} as BaseNode.Speak.TraceFrame;

export const DB_VISUAL_TRACE: BaseNode.Visual.TraceFrame = {
  type: BaseNode.Utils.TraceType.VISUAL,
  payload: {
    visualType: BaseNode.Visual.VisualType.IMAGE,
    image: 'the-image.url',
    device: BaseNode.Visual.DeviceType.DESKTOP,
    dimensions: {
      height: 100,
      width: 200,
    },
    canvasVisibility: BaseNode.Visual.CanvasVisibility.CROPPED,
  },
};

export const context: PartialContext<Context> = {
  trace: [malformedTrace1, malformedTrace2, DB_VISUAL_TRACE],
};
