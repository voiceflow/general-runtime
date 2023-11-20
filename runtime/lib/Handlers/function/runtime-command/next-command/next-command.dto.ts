import { z } from 'zod';

export const NextPathDTO = z
  .object({
    path: z.string(),
  })
  .strict();

export type NextPath = z.infer<typeof NextPathDTO>;

export const NextStageDTO = z
  .object({
    listen: z.boolean(),
    stage: z.string(),
  })
  .strict();

export type NextStage = z.infer<typeof NextStageDTO>;

export const NextCommandDTO = z.union([NextPathDTO, NextStageDTO]);

export type NextCommand = z.infer<typeof NextCommandDTO>;

export const isNextPath = (val: unknown): val is NextPath => NextPathDTO.safeParse(val).success;

export const isNextStage = (val: unknown): val is NextStage => NextStageDTO.safeParse(val).success;
