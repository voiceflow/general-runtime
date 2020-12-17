import { Config } from '@/types';

// eslint-disable-next-line import/prefer-default-export
export abstract class AbstractClient {
  constructor(public config: Config) {}
}
