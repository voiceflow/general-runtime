import { z } from 'zod';

export const PromptWrapperExtractionResult = z.object({
  type: z.enum(['reprompt', 'fulfilled', 'exit']),
  entityState: z.record(z.string().or(z.null())),
  rationale: z.string(),
  response: z.string(),
});

export type PromptWrapperExtractionResult = z.infer<typeof PromptWrapperExtractionResult>;
