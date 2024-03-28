import { z } from 'zod';

import { constraints } from '../constants';
import { ButtonType } from './button-type.enum';

const FUNCTION_BUTTON_NAME_REGEX = /^[A-Z_a-z]\w*$/;

export const SimpleGeneralButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  payload: z.object({
    type: z.literal(ButtonType.GENERAL),
    code: z
      .string()
      .max(constraints.MAX_SMALL_STRING_LENGTH)
      .regex(FUNCTION_BUTTON_NAME_REGEX)
      .describe('Defines the custom button request type'),
  }),
});

export type SimpleGeneralButton = z.infer<typeof SimpleGeneralButtonDTO>;
