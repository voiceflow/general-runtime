import { z } from 'zod';

import { SimpleActionButtonDTO } from '../button/action-button.dto';

export const SimpleCardDTO = z.object({
  imageUrl: z.string(),
  title: z.string(),
  description: z.object({
    text: z.string(),
  }),
  buttons: z.array(SimpleActionButtonDTO).optional(),
});

export type SimpleCard = z.infer<typeof SimpleCardDTO>;
