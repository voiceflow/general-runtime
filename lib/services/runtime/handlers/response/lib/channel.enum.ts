import { Enum } from '@/runtime/typings/enum';

export const Channel = {
  DEFAULT: 'default',
} as const;

export type Channel = Enum<typeof Channel>;
