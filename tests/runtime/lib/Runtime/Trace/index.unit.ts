import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { EventType } from '@/runtime/lib/Lifecycle';
import Trace from '@/runtime/lib/Runtime/Trace';
import { mockTime } from '@/tests/lib/services/dialog/fixture';

describe('Runtime Trace unit tests', () => {
  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('addTrace', () => {
    it('adds frame', () => {
      const runtime = { callEvent: sinon.stub() };

      const trace = new Trace(runtime as any);
      const frame = { foo: 'bar', time: mockTime };
      trace.addTrace(frame as any);

      expect(_.get(trace, 'trace')).to.eql([frame]);
      expect(runtime.callEvent.callCount).to.eql(1);
      expect(runtime.callEvent.args[0][0]).to.eql(EventType.traceWillAdd);
      expect(runtime.callEvent.args[0][1].frame).to.eql(frame);
      expect(typeof runtime.callEvent.args[0][1].stop).to.eql('function');
    });

    it('does not add frame', () => {
      const runtime = { callEvent: sinon.stub() };
      const fakeFn = (
        _event: string,
        utils: { frame: BaseNode.Utils.BaseTraceFrame; stop: (...args: any[]) => any }
      ) => {
        utils.stop();
      };
      runtime.callEvent.callsFake(fakeFn);

      const trace = new Trace(runtime as any);
      trace.addTrace({ foo: 'bar' } as any);

      expect(_.get(trace, 'trace')).to.eql([]);
    });
  });

  it('get', () => {
    const traceObj = new Trace(null as any);
    const trace = [{}, {}];
    _.set(traceObj, 'trace', trace);
    expect(traceObj.get()).to.eql(trace);
  });
});
