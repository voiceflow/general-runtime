import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import Client from '@/runtime/lib/Client';
import { EventType } from '@/runtime/lib/Lifecycle';
import * as Runtime from '@/runtime/lib/Runtime';

describe('client unit tests', () => {
  describe('constructor', () => {
    it('default values', () => {
      const api = { getProgram: 'test' } as any;

      const client = new Client({ api });
      expect(_.get(client, 'options')).to.eql({
        api,
        handlers: [],
        services: {},
      });
    });

    it('correct options init', () => {
      const api = { getProgram: 'test' } as any;
      const handlers = ['a', 'b'];
      const services = { s1: 'v1' };

      const client = new Client({ api, handlers: handlers as any, services });
      expect(_.get(client, 'options')).to.eql({
        api,
        handlers,
        services,
      });
    });
  });

  describe('createRuntime', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('correct init of runtime', () => {
      const runtimeStub = sinon.stub(Runtime, 'default');
      const newRuntime = { foo: 'bar' };
      runtimeStub.returns(newRuntime);

      const client = new Client({ op0: 'val0' } as any);

      const versionID = 'version-id';
      const version = { id: versionID };
      const state = 'state';
      const request = 'request';
      const options = { op1: 'val1' };
      const timeout = Math.random() * 1000;

      expect(
        client.createRuntime({
          versionID,
          state,
          request,
          options,
          version,
          timeout,
        } as any)
      ).to.eql(newRuntime);
      expect(runtimeStub.calledWithNew()).to.eql(true);
      expect(runtimeStub.args).to.eql([
        [
          {
            versionID,
            state,
            request,
            options: { ..._.get(client, 'options'), ...options },
            events: _.get(client, 'events'),
            version,
            project: undefined,
            plan: undefined,
            timeout,
          },
        ],
      ]);
    });
  });

  describe('events', () => {
    it('set, get and call', async () => {
      const api = { getProgram: 'test' } as any;
      const client = new Client({ api });

      const eventCallback = sinon.stub();
      client.setEvent(EventType.programDidFetch, eventCallback);

      const event = { foo: 'bar' };
      const runtime = 'runtime';
      await client.callEvent(EventType.programDidFetch, event as any, runtime as any);
      expect(eventCallback.callCount).to.eql(1);
      expect(eventCallback.args).to.eql([[{ ...event, runtime }]]);

      // event not found
      expect(async () =>
        client.callEvent('random' as any, event as any, runtime as any)
      ).not.throw();
    });
  });
});
