import { z } from 'zod';

import { SimpleButtonDTO } from '../button/button.dto';

export const SimpleCardDTO = z.object({
  imageUrl: z.string(),
  title: z.string(),
  description: z.object({
    text: z.string(),
  }),
  buttons: z.array(SimpleButtonDTO).optional(),
});

export type SimpleCard = z.infer<typeof SimpleCardDTO>;
