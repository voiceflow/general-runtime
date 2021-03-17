import { EventType, RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { generalEventMatcher } from '@/lib/services/runtime/handlers/event';

describe('event handlers unit tests', () => {
  describe('generalEventMatcher', () => {
    describe('match', () => {
      it('no request', async () => {
        const runtime = { getRequest: sinon.stub().returns(null) };
        expect(generalEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('not event req', async () => {
        const runtime = {
          getRequest: sinon.stub().returns({
            type: 'random',
            payload: {
              /* no 'name' in payload */
            },
          }),
        };
        expect(generalEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('no event', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: 'event', payload: {} }) };
        expect(generalEventMatcher.match({ runtime } as any)).to.eql(false);
      });

      it('no event type', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: 'event' }) };
        const event = { type: '' };
        expect(generalEventMatcher.match({ runtime, event } as any)).to.eql(false);
      });

      it('event name not match with req', () => {
        const runtime = { getRequest: sinon.stub().returns({ type: 'event1', payload: {} }) };
        const event = { type: 'trace', name: 'event1' };
        expect(generalEventMatcher.match({ runtime, event } as any)).to.eql(false);
      });

      it('full match', async () => {
        const runtime = { getRequest: sinon.stub().returns({ type: 'event1', payload: {} }) };
        const event = { type: 'event1', name: 'event1' };
        expect(generalEventMatcher.match({ runtime, event } as any)).to.eql(true);
      });
    });
  });
});
