import { z } from 'zod';

export const PromptWrapperExtractionResultType = z.enum(['reprompt', 'fulfilled', 'exit']);
export type PromptWrapperExtractionResultType = z.infer<typeof PromptWrapperExtractionResultType>;

export const PromptWrapperExtractionResult = z.object({
  type: PromptWrapperExtractionResultType,
  entityState: z.record(z.string().or(z.null())),
  rationale: z.string(),
  response: z.string(),
});

export type PromptWrapperExtractionResult = z.infer<typeof PromptWrapperExtractionResult>;
