import { EventType, RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { traceEventMatcher } from '@/lib/services/runtime/handlers/event';

describe('event handlers unit tests', () => {
  describe('traceEventMatcher', () => {
    describe('match', () => {
      it('no request', async () => {
        const runtime = { getRequest: sinon.stub().returns(null) };
        expect(traceEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('not event req', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: RequestType.INTENT }) };
        expect(traceEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('no event', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: RequestType.EVENT }) };
        expect(traceEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('event type not trace', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: RequestType.EVENT }) };
        const event = { type: EventType.INTENT };
        expect(traceEventMatcher.match({ runtime, event } as any)).to.eql(false);
      });

      it('event name not match with req', () => {
        const runtime = { getRequest: sinon.stub().returns({ type: RequestType.EVENT, payload: { name: 'event1' } }) };
        const event = { type: EventType.TRACE, name: 'event2' };
        expect(traceEventMatcher.match({ runtime, event } as any)).to.eql(false);
      });

      it('full match', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: RequestType.EVENT, payload: { name: 'event1' } }) };
        const event = { type: EventType.TRACE, name: 'event1' };
        expect(traceEventMatcher.match({ runtime, event } as any)).to.eql(true);
      });
    });
  });
});
