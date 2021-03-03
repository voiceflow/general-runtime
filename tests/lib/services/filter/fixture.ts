import { BlockTrace, ChoiceTrace, DebugTrace, SpeakTrace, TraceType } from '@/../general-types/build';
import { SpeakType } from '@/../general-types/build/nodes/speak';
import { Context, PartialContext } from '@/../runtime/build';

export const BLOCK_TRACE_START: BlockTrace = {
  type: TraceType.BLOCK,
  payload: {
    blockID: 'start00000000000000000000',
  },
};

export const DEBUG_TRACE: DebugTrace = {
  type: TraceType.DEBUG,
  payload: {
    message: 'beginning flow',
  },
};

export const BLOCK_TRACE_MIDDLE: BlockTrace = {
  type: TraceType.BLOCK,
  payload: {
    blockID: '60216838334555678f8370be',
  },
};

export const SPEAK_TRACE_SSML: SpeakTrace = {
  type: TraceType.SPEAK,
  payload: {
    message: '<prosody rate="x-fast">Welcome to Voiceflow Burger</prosody>',
    type: SpeakType.MESSAGE,
  },
};

export const SPEAK_TRACE_NO_SSML: SpeakTrace = {
  type: TraceType.SPEAK,
  payload: {
    message: 'Welcome to Voiceflow Burger',
    type: SpeakType.MESSAGE,
  },
};

export const CHOICE_TRACE: ChoiceTrace = {
  type: TraceType.CHOICE,
  payload: {
    choices: [],
  },
};

export const context: PartialContext<Context> = {
  trace: [BLOCK_TRACE_START, DEBUG_TRACE, BLOCK_TRACE_MIDDLE, SPEAK_TRACE_NO_SSML, SPEAK_TRACE_SSML, CHOICE_TRACE],
};
