import { z } from 'zod';

export const NextPathDTO = z
  .object({
    path: z.string(),
  })
  .strict();

export type NextPort = z.infer<typeof NextPathDTO>;

export const NextStageDTO = z
  .object({
    listen: z.boolean(),
    stage: z.string(),
  })
  .strict();

export type NextEvent = z.infer<typeof NextStageDTO>;

export const NextCommandDTO = z.union([NextPathDTO, NextStageDTO]);

export type NextCommand = z.infer<typeof NextCommandDTO>;
