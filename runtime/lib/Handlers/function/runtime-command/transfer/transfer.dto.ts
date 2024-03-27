import { z } from 'zod';

export enum TransferType {
  PATH = 'path',
}

export const PathTransferDTO = z.object({
  type: z.literal(TransferType.PATH),
  path: z.string({
    required_error: `One of the paths in the next command's \`to\` property is not defined`,
    invalid_type_error: `Expected value of type 'string' for 'path' property`,
  }),
});

export type PathTransfer = z.infer<typeof PathTransferDTO>;

export const TransferDTO = z.discriminatedUnion('type', [PathTransferDTO]);

export type Transfer = z.infer<typeof TransferDTO>;
