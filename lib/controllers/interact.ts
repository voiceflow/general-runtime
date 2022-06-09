/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest } from '@voiceflow/base-types';

import { ResponseContext } from '@/lib/services/interact';
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { PredictionStage, Request } from '@/types';

import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string; versionID: string } }) {
    return this.services.interact.state(req);
  }

  async handler(
    req: Request<
      Record<string, unknown>,
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { versionID: string; stage: PredictionStage },
      { locale?: string }
    >
  ): Promise<ResponseContext> {
    return this.services.interact.handler(req);
  }
}

export default InteractController;
