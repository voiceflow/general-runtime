import { z } from 'zod';

import { ConditionalTransferDTO } from './transfer/conditional-transfer.dto';
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

export const NextBranchesDTO = z.object({
  defaultTo: TransferDTO,
  to: z.array(ConditionalTransferDTO),
});

export type NextBranches = z.infer<typeof NextBranchesDTO>;

export const NextManyCommandDTO = NextBranchesDTO.extend({
  listen: z.literal(true),
});

export const NextCommandDTO = z.union([NextPathDTO, NextManyCommandDTO]);

export type NextCommand = z.infer<typeof NextCommandDTO>;
