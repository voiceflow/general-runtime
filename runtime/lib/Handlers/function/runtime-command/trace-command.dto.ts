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
  Choice = 'choice',
}

const constraints = {
  MAX_SMALL_STRING_LENGTH: 128,
} as const;

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

export const SimpleActionButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  payload: z.object({
    type: z
      .literal('action')
      .optional()
      .describe('Type of the button. Optional due to backwards compatibility reasons'),
    actions: z.array(SimpleActionDTO),
  }),
});

export type SimpleActionButton = z.infer<typeof SimpleActionButtonDTO>;

export const SimpleGeneralButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  payload: z.object({
    code: z.string().max(constraints.MAX_SMALL_STRING_LENGTH).describe('Defines the custom button request type'),
  }),
});

export type SimpleGeneralButton = z.infer<typeof SimpleGeneralButtonDTO>;

export const SimpleCardDTO = z.object({
  imageUrl: z.string(),
  title: z.string(),
  description: z.object({
    text: z.string(),
  }),
  buttons: z.array(SimpleActionButtonDTO).optional(),
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

export const SimpleChoiceTraceDTO = TraceDTO.extend({
  type: z.literal(SimpleTraceType.Choice),
  payload: z.object({
    buttons: z.array(SimpleGeneralButtonDTO),
  }),
}).passthrough();

export type SimpleChoiceTrace = z.infer<typeof SimpleChoiceTraceDTO>;

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
