/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';

import { ResponseContext } from '@/lib/services/interact';
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request } from '@/types';

import { validate } from '../utils';
import { SharedValidations } from '../validations';
import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string; versionID: string } }): Promise<State> {
    return this.services.interact.state(req);
  }

  @validate({
    QUERY_LOGS: SharedValidations.Runtime.QUERY.LOGS,
  })
  async handler(
    req: Request<
      { userID: string },
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { authorization: string; versionID: string; },
      { locale?: string; logs: RuntimeLogs.LogLevel }
    >
  ): Promise<ResponseContext> {
    return this.services.interact.handler(req);
  }
}

export default InteractController;
