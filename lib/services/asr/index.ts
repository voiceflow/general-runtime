/**
 * [[include:asr.md]]
 * @packageDocumentation
 */

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class ASR extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement ASR handler
  handle = (context: Context) => context;
}

export default ASR;
