import _ from 'lodash';

import { ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class TTS extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement TTS handler
  handle = _.identity;
}

export default TTS;
