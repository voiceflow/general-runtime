import { DeviceType, SpeakTrace, TraceType, VisualTrace } from '@voiceflow/general-types';
import { CanvasVisibility, VisualType } from '@voiceflow/general-types/build/nodes/visual';
import { Context, PartialContext } from '@voiceflow/runtime/build';

export const audioUrl = 'http://localhost:8000/audio.local/1613583846532-mixaund-tech-corporate.mp3';

export const audioMsg = `<audio src="${audioUrl}"/>`;

export const malformedTrace1 = {
  type: TraceType.SPEAK,
  payload: {
    message: audioMsg,
  },
} as SpeakTrace;

export const malformedTrace2 = {
  type: TraceType.SPEAK,
  payload: {
    message: '',
  },
} as SpeakTrace;

export const DB_VISUAL_TRACE: VisualTrace = {
  type: TraceType.VISUAL,
  payload: {
    visualType: VisualType.IMAGE,
    image: 'the-image.url',
    device: DeviceType.DESKTOP,
    dimensions: {
      height: 100,
      width: 200,
    },
    canvasVisibility: CanvasVisibility.CROPPED,
  },
};

export const context: PartialContext<Context> = {
  trace: [malformedTrace1, malformedTrace2, DB_VISUAL_TRACE],
};
