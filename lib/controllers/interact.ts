/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { Request as BaseRequest } from '@voiceflow/base-types';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request } from '@/types';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string; version: string } }) {
    return this.services.interact.state(req);
  }

  async handler(
    req: Request<
      Record<string, unknown>,
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { version: string },
      { locale?: string }
    >
  ) {
    return this.services.interact.handler(req);
  }
}

export default InteractController;
