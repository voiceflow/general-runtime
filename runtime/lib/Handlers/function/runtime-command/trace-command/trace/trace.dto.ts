import { z } from 'zod';

import { TraceType } from './trace-type.enum';

/**
 * Definitions for traces producible by the Functions code. This is a
 * separate set of type definitions that our internal type definitions
 * for the various traces, because we want to provide a stable, clean
 * interface to the user. Our existing trace types have legacy features and
 * unnecessary complications that we do not want to expose to the user.
 */

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
