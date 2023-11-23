import { z } from 'zod';

import { TraceType } from './trace-type.enum';

// !TODO! - Replace with trace types from `@voiceflow/dtos'`

export const TextTraceDTO = z.object({
  type: z.literal(TraceType.TEXT),
  payload: z.object({
    message: z.string(),
    delay: z.number().optional(),
  }),
});

export type TextTrace = z.infer<typeof TextTraceDTO>;

export const DebugTraceDTO = z.object({
  type: z.literal(TraceType.DEBUG),
  payload: z.object({
    message: z.string(),
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
