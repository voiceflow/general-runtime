import { BaseNode } from '@voiceflow/base-types';
import { z } from 'zod';

import { SimpleCardDTO } from '../card/card.dto';
import { UnknownTraceDTO } from './base.dto';
import { SimpleTraceType } from './simple-trace-type.enum';

export const SimpleCarouselTraceDTO = UnknownTraceDTO.extend({
  type: z.literal(SimpleTraceType.Carousel),
  payload: z.object({
    layout: z.nativeEnum(BaseNode.Carousel.CarouselLayout).optional(),
    cards: z.array(SimpleCardDTO),
  }),
}).passthrough();

export type SimpleCarouselTrace = z.infer<typeof SimpleCarouselTraceDTO>;
