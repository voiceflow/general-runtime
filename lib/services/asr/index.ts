import _ from 'lodash';

import { ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class ASR extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement ASR handler
  handle = _.identity;
}

export default ASR;
