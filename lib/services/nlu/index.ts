import _ from 'lodash';

import { ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement NLU handler
  handle = _.identity;
}

export default NLU;
