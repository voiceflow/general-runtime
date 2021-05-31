/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { Config } from '@voiceflow/general-types';
import { Request } from 'express';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string }; params: { versionID: string } }) {
    return this.services.interact.state(req);
  }

  async handler(req: Request<{ versionID: string }, null, { state?: State; request?: RuntimeRequest; config?: Config }, { locale?: string }>) {
    return this.services.interact.handler(req);
  }
}

export default InteractController;
