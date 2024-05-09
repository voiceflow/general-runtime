import { AnyRequestDTO } from '@voiceflow/dtos';

import logger from '@/logger';
import { Config } from '@/types';

import { FullServiceMap } from '../services';

export abstract class AbstractController {
  constructor(public services: FullServiceMap, public config: Config) {}
}

export function logMalformedRequest(request: Record<string, any> | null | undefined, type: 'action' | 'request') {
  if (!!request && !AnyRequestDTO.safeParse(request).success) {
    logger.info(
      `malformed request object [${type}], [type]=${request?.type}, [json]=${JSON.stringify(request, null, 2)}`
    );
  }
}
