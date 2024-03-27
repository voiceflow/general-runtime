import { z } from 'zod';

const FUNCTION_BUTTON_NAME_REGEX = /^[A-Z_a-z][\dA-Za-z]*$/;

export const SimpleGeneralButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  payload: z.object({
    code: z
      .string()
      .max(constraints.MAX_SMALL_STRING_LENGTH)
      .regex(FUNCTION_BUTTON_NAME_REGEX)
      .describe('Defines the custom button request type'),
  }),
});

export type SimpleGeneralButton = z.infer<typeof SimpleGeneralButtonDTO>;
