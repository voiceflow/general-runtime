import { AnyRequestDTO } from '@voiceflow/dtos';
import z from 'zod';

export const InteractRequestBody = z.object({
  action: AnyRequestDTO,
  session: z.object({
    sessionID: z.string(),
    userID: z.string(),
  }),
  state: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
});
export type InteractRequestBody = z.infer<typeof InteractRequestBody>;

export const InteractRequestParams = z.object({
  projectID: z.string(),
  versionID: z.string(),
});
export type InteractRequestParams = z.infer<typeof InteractRequestParams>;
