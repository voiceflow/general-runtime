/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';

import { ResponseContext } from '@/lib/services/interact';
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request, Response } from '@/types';

import { validate } from '../utils';
import { SharedValidations } from '../validations';
import { AbstractController } from './utils';

class InteractController extends AbstractController {
  async state(req: { headers: { versionID: string } }): Promise<State> {
    const { versionID } = req.headers;
    return this.services.interact.state(versionID);
  }

  @validate({
    QUERY_LOGS: SharedValidations.Runtime.QUERY.LOGS,
  })
  async handler(
    req: Request<
      { userID: string },
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { authorization: string; versionID: string },
      { locale?: string; logs: RuntimeLogs.LogLevel }
    >,
    res: Response
  ) {
    if (req.body.config?.stream === true) {
      req.socket.setNoDelay(true);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      });
      res.write(':ok\n\n');

      let closed = false;
      req.on('close', () => {
        closed = true;
      });

      await this.services.interact.handler(req, (event) => {
        if (closed) return;

        console.log('send event');

        switch (event.type) {
          case 'trace': {
            res.write('event: trace\n');
            res.write('data: '+ JSON.stringify({ type: 'trace', trace: event.trace }) + '\n\n');
            break;
          }
        }
      });

      await new Promise<void>((resolve) => res.end('', () => resolve()));
    } else {
      return this.services.interact.handler(req, () => void 0);
    }
  }
}

export default InteractController;
