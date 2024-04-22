import { z } from 'zod';

import { SimpleActionButtonDTO } from './action-button.dto';
import { SimpleGeneralButtonDTO } from './general-button.dto';

export const SimpleButtonDTO = z.union([SimpleActionButtonDTO, SimpleGeneralButtonDTO]);

export type SimpleButton = z.infer<typeof SimpleButtonDTO>;
