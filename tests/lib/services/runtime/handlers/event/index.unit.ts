import { Node, Request } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { findEventMatcher, generalEventMatcher, hasEventMatch, intentEventMatcher } from '@/lib/services/runtime/handlers/event';
import * as utils from '@/lib/services/runtime/utils';

describe('event handlers unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

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

  describe('intentEventMatcher', () => {
    describe('match', () => {
      it('no request', () => {
        expect(intentEventMatcher.match({ runtime: { getRequest: sinon.stub().returns(null) } } as any)).to.eql(false);
      });

      it('no event', () => {
        expect(
          intentEventMatcher.match({
            runtime: {
              getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
            },
          } as any)
        ).to.eql(false);
      });

      it('event type not intent', () => {
        expect(
          intentEventMatcher.match({
            event: { type: 'random' },
            runtime: {
              getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
            },
          } as any)
        ).to.eql(false);
      });

      it('name does not match', () => {
        expect(
          intentEventMatcher.match({
            event: { type: Node.Utils.EventType.INTENT, intent: 'different_name' },
            runtime: {
              getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
            },
          } as any)
        ).to.eql(false);
      });

      it('match', () => {
        expect(
          intentEventMatcher.match({
            event: { type: Node.Utils.EventType.INTENT, intent: 'intent_name' },
            runtime: {
              getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
            },
          } as any)
        ).to.eql(true);
      });
    });

    describe('sideEffect', () => {
      it('no entities and mappings', () => {
        const mapEntitiesOutput = { foo: 'bar' };
        const mapEntitiesStub = sinon.stub(utils, 'mapEntities').returns(mapEntitiesOutput);

        const request = { payload: {} };
        const context = { event: {}, runtime: { getRequest: sinon.stub().returns(request) }, variables: { merge: sinon.stub() } };

        intentEventMatcher.sideEffect(context as any);

        expect(context.runtime.getRequest.callCount).to.eql(1);
        expect(mapEntitiesStub.args).to.eql([[[], []]]);
        expect(context.variables.merge.args).to.eql([[mapEntitiesOutput]]);
      });

      it('entities and mappings', () => {
        const mapEntitiesOutput = { foo: 'bar' };
        const mapEntitiesStub = sinon.stub(utils, 'mapEntities').returns(mapEntitiesOutput);

        const request = { payload: { entities: ['e1', 'e2'] } };
        const context = {
          event: { mappings: ['m1', 'm2'] },
          runtime: { getRequest: sinon.stub().returns(request) },
          variables: { merge: sinon.stub() },
        };

        intentEventMatcher.sideEffect(context as any);

        expect(context.runtime.getRequest.callCount).to.eql(1);
        expect(mapEntitiesStub.args).to.eql([[context.event.mappings, request.payload.entities]]);
        expect(context.variables.merge.args).to.eql([[mapEntitiesOutput]]);
      });
    });
  });

  describe('hasEventMatch', () => {
    it('false', () => {
      expect(hasEventMatch(null, { getRequest: sinon.stub().returns(null) } as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        hasEventMatch(
          { type: Node.Utils.EventType.INTENT, intent: 'intent_name' } as any,
          {
            getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
          } as any
        )
      ).to.eql(true);
    });
  });

  describe('findEventMatcher', () => {
    it('not found', () => {
      expect(findEventMatcher({ event: null, runtime: { getRequest: sinon.stub().returns(null) } } as any)).to.eql(null);
    });

    it('found', () => {
      expect(
        Object.keys(
          findEventMatcher({
            event: { type: Node.Utils.EventType.INTENT, intent: 'intent_name' },
            runtime: {
              getRequest: sinon.stub().returns({ type: Request.RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } }),
            },
          } as any)!
        )
      ).to.eql(['match', 'sideEffect']);
    });
  });
});
