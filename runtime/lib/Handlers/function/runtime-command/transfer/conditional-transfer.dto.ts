import { z } from 'zod';

import { TransferDTO } from './transfer.dto';

export const ConditionalTransferDTO = z.object({
  on: z.record(z.any()).describe('An underscore-query matching criteria object'),
  dest: z
    .union([z.string(), TransferDTO])
    .describe('If `string`, then this is a path transfer. Otherwise, it is an object specifying the kind of transfer'),
});

export type ConditionalTransfer = z.infer<typeof ConditionalTransferDTO>;
