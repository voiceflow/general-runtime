import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { Context, PartialContext } from '@/runtime';

export const BLOCK_TRACE_START: BaseTrace.BlockTrace = {
  type: BaseNode.Utils.TraceType.BLOCK,
  payload: {
    blockID: 'start00000000000000000000',
  },
};

export const DEBUG_TRACE: BaseTrace.DebugTrace = {
  type: BaseNode.Utils.TraceType.DEBUG,
  payload: {
    message: 'beginning flow',
  },
};

export const BLOCK_TRACE_MIDDLE: BaseTrace.BlockTrace = {
  type: BaseNode.Utils.TraceType.BLOCK,
  payload: {
    blockID: '60216838334555678f8370be',
  },
};

export const SPEAK_TRACE_SSML: BaseTrace.SpeakTrace = {
  type: BaseNode.Utils.TraceType.SPEAK,
  payload: {
    message: '<prosody rate="x-fast">Welcome to Voiceflow Burger</prosody>',
    type: BaseNode.Speak.TraceSpeakType.MESSAGE,
  },
};

export const SPEAK_TRACE_NO_SSML: BaseTrace.SpeakTrace = {
  type: BaseNode.Utils.TraceType.SPEAK,
  payload: {
    message: 'Welcome to Voiceflow Burger',
    type: BaseNode.Speak.TraceSpeakType.MESSAGE,
  },
};

export const CHOICE_TRACE: BaseTrace.ChoiceTrace = {
  type: BaseNode.Utils.TraceType.CHOICE,
  payload: {
    buttons: [],
  },
};

export const context: PartialContext<Context> = {
  trace: [
    BLOCK_TRACE_START,
    DEBUG_TRACE,
    BLOCK_TRACE_MIDDLE,
    SPEAK_TRACE_NO_SSML,
    SPEAK_TRACE_SSML,
    CHOICE_TRACE,
  ],
};
