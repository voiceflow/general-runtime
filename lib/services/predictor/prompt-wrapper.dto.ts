import { z } from 'zod';

export const PromptWrapperResult = z.object({
  prompt: z.string(),
});

export type PromptWrapperResult = z.infer<typeof PromptWrapperResult>;
