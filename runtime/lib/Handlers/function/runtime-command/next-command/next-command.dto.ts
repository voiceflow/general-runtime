import { z } from 'zod';

export const NextPathDTO = z
  .object({
    path: z.string({
      required_error: `A next command must include a 'path' property`,
      invalid_type_error: `Expected value of type 'string' for 'path' property of a next command`,
    }),
  })
  .strict();

export type NextPath = z.infer<typeof NextPathDTO>;

export const NextCommandDTO = NextPathDTO;

export type NextCommand = z.infer<typeof NextCommandDTO>;

export const isNextPath = (val: unknown): val is NextPath => NextPathDTO.safeParse(val).success;
