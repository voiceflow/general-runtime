import _ from 'lodash';

import { ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class DialogManagement extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement DialogManagement handler
  handle = _.identity;
}

export default DialogManagement;
