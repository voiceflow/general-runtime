import z from 'zod';

export const InteractRequestBody = z.object({
  action: z.record(z.any()),
  session: z.object({
    sessionID: z.string(),
    userID: z.string()
  }),
  state: z.record(z.any()).optional(),
  config: z.record(z.any()).optional()
});
export type InteractRequestBody = z.infer<typeof InteractRequestBody>;

export const InteractRequestParams = z.object({
  projectID: z.string(),
  versionID: z.string()
});
export type InteractRequestParams = z.infer<typeof InteractRequestParams>;

export const InteractRequestHeaders = z.object({
  accept: z.enum(['text/event-stream', 'application/json']).or(z.string()),
  authorization: z.string()
});
export type InteractRequestHeaders = z.infer<typeof InteractRequestHeaders>;

export const InteractRequestQuery = z.object({

});
export type InteractRequestQuery = z.infer<typeof InteractRequestQuery>;
