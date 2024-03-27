import { z } from 'zod';

import { MatchedTransferDTO } from './transfer/matched-transfer.dto';
import { TransferDTO } from './transfer/transfer.dto';

export const NextPathDTO = z
  .object({
    path: z.string({
      required_error: `A next command must include a 'path' property`,
      invalid_type_error: `Expected value of type 'string' for 'path' property of a next command`,
    }),
  })
  .strict();

export type NextPath = z.infer<typeof NextPathDTO>;

export const NextManyCommandDTO = z.object({
  listen: z.literal(true),
  defaultTo: TransferDTO,
  to: z.array(MatchedTransferDTO),
});

export const NextCommandDTO = NextPathDTO;

export type NextCommand = z.infer<typeof NextCommandDTO>;
