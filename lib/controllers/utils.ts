import { Config } from '@/types';

import { FullServiceMap } from '../services';

export abstract class AbstractController {
  constructor(public services: FullServiceMap, public config: Config) {}
}
