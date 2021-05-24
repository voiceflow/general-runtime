import { AbstractManager as BaseAbstractMiddleware } from '@voiceflow/backend-utils';

import { Config } from '@/types';

import { FullServiceMap } from '../services';

// eslint-disable-next-line import/prefer-default-export
export abstract class AbstractMiddleware extends BaseAbstractMiddleware<FullServiceMap, Config> {}
