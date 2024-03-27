import { BaseRequest } from '@voiceflow/base-types';
import { z } from 'zod';

export const SimpleURLActionDTO = z.object({
  type: z.literal(BaseRequest.Action.ActionType.OPEN_URL),
  url: z.string(),
});

export type SimpleURLAction = z.infer<typeof SimpleURLActionDTO>;

export const SimpleActionDTO = z.discriminatedUnion('type', [SimpleURLActionDTO]);

export type SimpleAction = z.infer<typeof SimpleActionDTO>;

export const SimpleActionButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  payload: z.object({
    type: z
      .literal('action')
      .optional()
      .describe('Type of the button. Optional due to backwards compatibility reasons'),
    actions: z.array(SimpleActionDTO),
  }),
});

export type SimpleActionButton = z.infer<typeof SimpleActionButtonDTO>;
