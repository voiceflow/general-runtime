import { z } from 'zod';

import { SimpleAudioTraceDTO } from './trace/audio.dto';
import { TraceDTO } from './trace/base.dto';
import { SimpleCardV2TraceDTO } from './trace/cardV2.dto';
import { SimpleCarouselTraceDTO } from './trace/carousel.dto';
import { SimpleChoiceTraceDTO } from './trace/choice.dto';
import { SimpleDebugTraceDTO } from './trace/debug.dto';
import { SimpleSpeakTraceDTO } from './trace/speak.dto';
import { SimpleTextTraceDTO } from './trace/text.dto';
import { SimpleVisualTraceDTO } from './trace/visual.dto';

export const TraceCommandDTO = z.array(TraceDTO, {
  invalid_type_error: 'A trace command must be a list of valid Voiceflow trace types',
});

export type TraceCommand = z.infer<typeof TraceCommandDTO>;

export const SimpleTraceDTO = z.discriminatedUnion('type', [
  SimpleTextTraceDTO,
  SimpleSpeakTraceDTO,
  SimpleAudioTraceDTO,
  SimpleDebugTraceDTO,
  SimpleVisualTraceDTO,
  SimpleCardV2TraceDTO,
  SimpleCarouselTraceDTO,
  SimpleChoiceTraceDTO,
]);

export type SimpleTrace = z.infer<typeof SimpleTraceDTO>;
