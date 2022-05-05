import { Config } from '@/types';

export abstract class AbstractClient {
  constructor(public config: Config) {}
}
