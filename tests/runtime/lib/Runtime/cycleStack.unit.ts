import { expect } from 'chai';
import sinon from 'sinon';

import { EventType } from '@/runtime/lib/Lifecycle';
import * as cycleHandler from '@/runtime/lib/Runtime/cycleHandler';
import cycleStack from '@/runtime/lib/Runtime/cycleStack';
import * as utils from '@/runtime/lib/Runtime/utils/variables';

describe('Runtime cycleStack unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('stack is empty', () => {
    const runtime = { stack: { getSize: sinon.stub().returns(0) }, end: sinon.stub() };
    cycleStack(runtime as any);
    expect(runtime.end.callCount).to.eql(1);
  });

  it('depth is above limit', () => {
    const runtime = { stack: { getSize: sinon.stub().returns(1) }, end: sinon.stub() };
    cycleStack(runtime as any, 61);
    expect(runtime.end.callCount).to.eql(1);
  });

  it('error exe where runtime ended', async () => {
    const newError = new Error('error');
    sinon.stub(cycleHandler, 'default').throws(newError);
    sinon.stub(utils, 'createCombinedVariables').returns({} as any);
    sinon.stub(utils, 'saveCombinedVariables');

    const runtime = {
      callEvent: sinon.stub(),
      stack: {
        getSize: sinon.stub().returns(1),
        top: sinon
          .stub()
          .returns({ getProgramID: sinon.stub().returns('program-id'), initialize: sinon.stub(), variables: { var1: 'val1', var2: 'val2' } }),
        getFrames: sinon.stub().returns({}),
      },
      hasEnded: sinon.stub().returns(true),
      getProgram: sinon.stub().returns({}),
      variables: 'runtime-variables',
    };

    await cycleStack(runtime as any);

    expect(runtime.callEvent.args[1]).to.eql([EventType.stateDidCatch, { error: newError }]);
  });

  describe('normal exe', () => {
    it('runtime ended', async () => {
      const cycleHandlerStub = sinon.stub(cycleHandler, 'default');
      const combinedVariables = {};
      const createCombinedVariablesStub = sinon.stub(utils, 'createCombinedVariables').returns(combinedVariables as any);
      const saveCombinedVariablesStub = sinon.stub(utils, 'saveCombinedVariables');

      const programID = 'program-id';
      const currentFrame = { getProgramID: sinon.stub().returns(programID), initialize: sinon.stub(), variables: { var1: 'val1', var2: 'val2' } };
      const currentFrames = {};
      const program = {};

      const runtime = {
        callEvent: sinon.stub(),
        stack: { getSize: sinon.stub().returns(1), top: sinon.stub().returns(currentFrame), getFrames: sinon.stub().returns(currentFrames) },
        hasEnded: sinon.stub().returns(true),
        getProgram: sinon.stub().returns(program),
        variables: 'runtime-variables',
      };

      await cycleStack(runtime as any);

      expect(runtime.getProgram.args).to.eql([[programID]]);
      expect(currentFrame.initialize.args).to.eql([[program]]);
      expect(createCombinedVariablesStub.args).to.eql([[runtime.variables, currentFrame.variables]]);
      expect(runtime.callEvent.args).to.eql([
        [EventType.stateWillExecute, { program, variables: combinedVariables }],
        [EventType.stateDidExecute, { program, variables: combinedVariables }],
      ]);
      expect(cycleHandlerStub.args).to.eql([[runtime, program, combinedVariables]]);
      expect(saveCombinedVariablesStub.args).to.eql([[combinedVariables, runtime.variables, currentFrame.variables]]);
    });

    it('stack is not the same after', async () => {
      sinon.stub(cycleHandler, 'default');
      sinon.stub(utils, 'createCombinedVariables').returns({} as any);
      sinon.stub(utils, 'saveCombinedVariables');

      const runtime = {
        callEvent: sinon.stub(),
        stack: {
          getSize: sinon.stub().onFirstCall().returns(1).onSecondCall().returns(0),
          top: sinon
            .stub()
            .returns({ getProgramID: sinon.stub().returns('program-id'), initialize: sinon.stub(), variables: { var1: 'val1', var2: 'val2' } }),
          getFrames: sinon.stub().onFirstCall().returns([{}]).onSecondCall().returns([]),
        },
        end: sinon.stub(),
        hasEnded: sinon.stub().returns(false),
        getProgram: sinon.stub().returns({}),
        variables: 'runtime-variables',
      };

      await cycleStack(runtime as any);

      // assert cycleStack recursion, on second iteration cycleStack calls runtime.end
      expect(runtime.end.callCount).to.eql(1);
    });

    describe('stack is the same', () => {
      it('no poppedFrame', async () => {
        sinon.stub(cycleHandler, 'default');
        sinon.stub(utils, 'createCombinedVariables').returns({} as any);
        sinon.stub(utils, 'saveCombinedVariables');

        const runtime = {
          callEvent: sinon.stub(),
          stack: {
            pop: sinon.stub().returns(null),
            getSize: sinon.stub().onFirstCall().returns(1).onSecondCall().returns(0),
            top: sinon
              .stub()
              .returns({ getProgramID: sinon.stub().returns('program-id'), initialize: sinon.stub(), variables: { var1: 'val1', var2: 'val2' } }),
            getFrames: sinon.stub().returns([]),
          },
          end: sinon.stub(),
          hasEnded: sinon.stub().returns(false),
          getProgram: sinon.stub().returns({}),
          variables: 'runtime-variables',
        };

        await cycleStack(runtime as any);

        expect(runtime.callEvent.callCount).to.eql(3);
        expect(runtime.callEvent.args[2]).to.eql([EventType.frameDidFinish, { frame: null }]);
      });

      it('with poppedFrame', async () => {
        sinon.stub(cycleHandler, 'default');
        const combinedVariables = { foo: 'bar' };
        sinon.stub(utils, 'createCombinedVariables').returns(combinedVariables as any);
        sinon.stub(utils, 'saveCombinedVariables');
        const mapStoresStub = sinon.stub(utils, 'mapStores');

        const OUTPUT_MAP = 'output-map';
        const topFrameVariables = { var1: 'val1', var2: 'val2' };
        const runtime = {
          callEvent: sinon.stub(),
          stack: {
            pop: sinon.stub().returns({ storage: { get: sinon.stub().returns(OUTPUT_MAP) } }),
            getSize: sinon.stub().onFirstCall().returns(1).onSecondCall().returns(0),
            top: sinon.stub().returns({ getProgramID: sinon.stub().returns('program-id'), initialize: sinon.stub(), variables: topFrameVariables }),
            getFrames: sinon.stub().returns([]),
          },
          end: sinon.stub(),
          hasEnded: sinon.stub().returns(false),
          getProgram: sinon.stub().returns({}),
          variables: 'runtime-variables',
        };

        await cycleStack(runtime as any);
        expect(mapStoresStub.args).to.eql([[OUTPUT_MAP, combinedVariables, topFrameVariables]]);
      });
    });
  });
});
