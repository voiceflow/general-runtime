import { z } from 'zod';

import { TraceType } from './trace-type.enum';

// !TODO! - Replace with trace types from `@voiceflow/dtos'`

export const TextTraceDTO = z.object({
  type: z.literal(TraceType.TEXT),
  payload: z.object({
    message: z.string({
      invalid_type_error: `Property 'payload.message' of a text trace must be a 'string'`,
      required_error: `A text trace must have a 'payload.message' property`,
    }),
    delay: z
      .number({
        invalid_type_error: `Property 'payload.delay' of a text trace must be a 'number'`,
      })
      .optional(),
  }),
});

export type TextTrace = z.infer<typeof TextTraceDTO>;

export const DebugTraceDTO = z.object({
  type: z.literal(TraceType.DEBUG),
  payload: z.object({
    message: z.string({
      invalid_type_error: `Property 'payload.message' of a debug trace must be a 'string'`,
      required_error: `A debug trace must have a 'payload.message' property`,
    }),
  }),
});

export type DebugTrace = z.infer<typeof DebugTraceDTO>;

export const CustomTraceDTO = z.object({
  type: z.literal(TraceType.CUSTOM),
  payload: z.unknown(),
});

export type CustomTrace = z.infer<typeof CustomTraceDTO>;

export const TraceDTO = z.discriminatedUnion('type', [TextTraceDTO, DebugTraceDTO, CustomTraceDTO]);

export type Trace = z.infer<typeof TraceDTO>;
