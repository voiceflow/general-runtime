import { AbstractManager as BaseAbstractMiddleware } from '@voiceflow/backend-utils';

import { Config } from '@/types';

import { FullServiceMap } from '../services';

export abstract class AbstractMiddleware extends BaseAbstractMiddleware<FullServiceMap, Config> {}
