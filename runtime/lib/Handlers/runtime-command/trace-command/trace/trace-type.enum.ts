import { Enum } from '@/runtime/typings/enum';

export const TraceType = {
  TEXT: 'text',
  DEBUG: 'debug',
  CUSTOM: 'custom',
} as const;

export type TraceType = Enum<typeof TraceType>;
