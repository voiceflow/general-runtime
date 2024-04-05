import { BaseRequestDTO } from '@voiceflow/dtos';
import { z } from 'zod';

export const SimpleGeneralButtonDTO = z.object({
  name: z.string().describe('Text for the button UI'),
  request: BaseRequestDTO.passthrough().describe(
    'The request object that will be sent back to the `runtime` if the button is clicked'
  ),
});

export type SimpleGeneralButton = z.infer<typeof SimpleGeneralButtonDTO>;
