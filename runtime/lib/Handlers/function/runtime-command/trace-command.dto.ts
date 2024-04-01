import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { z } from 'zod';

export enum SimpleTraceType {
  Text = 'text',
  Speak = 'speak',
  Audio = 'audio',
  Debug = 'debug',
  Visual = 'visual',
  CardV2 = 'cardV2',
  Carousel = 'carousel',
}

export const TraceDTO = z
  .object({
    type: z.string({
      required_error: `A Voiceflow trace must define a 'type' property`,
      invalid_type_error: `Property 'type' of a Voiceflow trace must be a string`,
    }),
    payload: z.unknown().optional(),
  })
  .passthrough();

export type Trace = z.infer<typeof TraceDTO>;

export const TraceCommandDTO = z.array(TraceDTO, {
  invalid_type_error: 'A trace command must be a list of valid Voiceflow trace types',
});

export type TraceCommand = z.infer<typeof TraceCommandDTO>;

export const SimpleTextTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Text),
  payload: z.object({
    message: z.string(),
  }),
}).passthrough();

export type SimpleTextTrace = z.infer<typeof SimpleTextTraceDTO>;

export const SimpleSpeakTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Speak),
  payload: z.object({
    message: z.string(),
    voice: z.string().optional(),
    src: z.string().optional(),
  }),
}).passthrough();

export type SimpleSpeakTrace = z.infer<typeof SimpleSpeakTraceDTO>;

export const SimpleAudioTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Audio),
  payload: z.object({
    src: z.string().optional(),
  }),
}).passthrough();

export type SimpleAudioTrace = z.infer<typeof SimpleAudioTraceDTO>;

export const SimpleDebugTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Debug),
  payload: z.object({
    message: z.string(),
  }),
}).passthrough();

export type SimpleDebugTrace = z.infer<typeof SimpleDebugTraceDTO>;

export const SimpleVisualTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Visual),
  payload: z.object({
    image: z.string(),
  }),
}).passthrough();

export type SimpleVisualTrace = z.infer<typeof SimpleVisualTraceDTO>;

export const SimpleURLActionDTO = z.object({
  type: z.literal(BaseRequest.Action.ActionType.OPEN_URL),
  url: z.string(),
});

export type SimpleURLAction = z.infer<typeof SimpleURLActionDTO>;

export const SimpleActionDTO = z.discriminatedUnion('type', [SimpleURLActionDTO]);

export type SimpleAction = z.infer<typeof SimpleActionDTO>;

export const SimpleButtonDTO = z.object({
  name: z.string(),
  payload: z.object({
    actions: z.array(SimpleActionDTO),
  }),
});

export type SimpleButton = z.infer<typeof SimpleButtonDTO>;

export const SimpleCardDTO = z.object({
  imageUrl: z.string(),
  title: z.string(),
  description: z.object({
    text: z.string(),
  }),
  buttons: z.array(SimpleButtonDTO).optional(),
});

export type SimpleCard = z.infer<typeof SimpleCardDTO>;

export const SimpleCardV2TraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.CardV2),
  payload: SimpleCardDTO,
}).passthrough();

export type SimpleCardV2Trace = z.infer<typeof SimpleCardV2TraceDTO>;

export const SimpleCarouselTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Carousel),
  payload: z.object({
    layout: z.nativeEnum(BaseNode.Carousel.CarouselLayout).optional(),
    cards: z.array(SimpleCardDTO),
  }),
}).passthrough();

export type SimpleCarouselTrace = z.infer<typeof SimpleCarouselTraceDTO>;

export const SimpleTraceDTO = z.discriminatedUnion('type', [
  SimpleTextTraceDTO,
  SimpleSpeakTraceDTO,
  SimpleAudioTraceDTO,
  SimpleDebugTraceDTO,
  SimpleVisualTraceDTO,
  SimpleCardV2TraceDTO,
  SimpleCarouselTraceDTO,
]);

export type SimpleTrace = z.infer<typeof SimpleTraceDTO>;
