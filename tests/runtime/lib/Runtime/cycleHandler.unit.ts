import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { Action } from '@/runtime';
import { EventType } from '@/runtime/lib/Lifecycle';
import cycleHandler, * as file from '@/runtime/lib/Runtime/cycleHandler';

describe('Runtime cycleHandler unit tests', () => {
  it('no node', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const runtime = {
      stack: { getFrames: sinon.stub().returns([]), top: sinon.stub().returns(referenceFrame) },
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const program = { getNode: sinon.stub().returns(null) };
    const variableState = {};

    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(program.getNode.args).to.eql([[nodeID]]);
  });

  it('no handler', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const handlers = [{ canHandle: () => false }, { canHandle: () => false }];
    const runtime = {
      stack: { getFrames: sinon.stub().returns([]), top: sinon.stub().returns(referenceFrame) },
      getHandlers: sinon.stub().returns(handlers),
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = {};
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(program.getNode.args).to.eql([[nodeID]]);
  });

  it('nextID is nodeID', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const handlers = [{ canHandle: () => false }, { canHandle: () => true, handle: sinon.stub().resolves(nodeID) }];
    const runtime = {
      callEvent: sinon.stub(),
      stack: { getFrames: sinon.stub().returns([]), top: sinon.stub().returns(referenceFrame) },
      getHandlers: sinon.stub().returns(handlers),
      end: sinon.stub(),
      hasEnded: sinon.stub().returns(true),
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = { id: nodeID };
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(runtime.callEvent.args).to.eql([
      [EventType.handlerWillHandle, { node, variables: variableState }],
      [EventType.handlerDidHandle, { node, variables: variableState }],
    ]);
    expect(runtime.end.callCount).to.eql(1);
  });

  it('handle error', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const error = new Error('random err');
    const handlers = [{ canHandle: () => false }, { canHandle: () => true, handle: sinon.stub().throws(error) }];
    const runtime = {
      callEvent: sinon.stub(),
      stack: { getFrames: sinon.stub().returns([]), top: sinon.stub().returns(referenceFrame) },
      getHandlers: sinon.stub().returns(handlers),
      hasEnded: sinon.stub().returns(true),
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = {};
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(runtime.callEvent.args).to.eql([
      [EventType.handlerWillHandle, { node, variables: variableState }],
      [EventType.handlerDidCatch, { error }],
    ]);
  });

  it('frames changed', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const handlers = [{ canHandle: () => false }, { canHandle: () => true, handle: sinon.stub().resolves('next-id') }];
    const runtime = {
      callEvent: sinon.stub(),
      stack: {
        getFrames: sinon.stub().onFirstCall().returns([]).onSecondCall().returns([{}]),
        top: sinon.stub().returns(referenceFrame),
      },
      getHandlers: sinon.stub().returns(handlers),
      hasEnded: sinon.stub().returns(false),
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = {};
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(runtime.stack.getFrames.callCount).to.eql(2);
  });

  it('cycle multiple times', async () => {
    const cyclesLimit = 3;
    _.set(file, 'HANDLER_OVERFLOW', cyclesLimit);
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID), setNodeID: sinon.stub() };
    const handlers = [{ canHandle: () => false }, { canHandle: () => true, handle: sinon.stub().resolves('next-id') }];
    const runtime = {
      callEvent: sinon.stub(),
      stack: {
        getFrames: sinon.stub().returns([]),
        top: sinon.stub().returns(referenceFrame),
      },
      getHandlers: sinon.stub().returns(handlers),
      hasEnded: sinon.stub().returns(false),
      getAction: sinon.stub().returns(Action.RUNNING),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = {};
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    // the fact that finishes means that i > HANDLER_OVERFLOW was hit
    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(runtime.hasEnded.callCount).to.eql(cyclesLimit + 1);
    expect(referenceFrame.setNodeID.args[0]).to.eql(['next-id']);
  });

  it('handles request', async () => {
    const nodeID = 'node-id';
    const referenceFrame = { getNodeID: sinon.stub().returns(nodeID) };
    const handlers = [{ canHandle: () => true, handle: sinon.stub().resolves(null) }];
    const runtime = {
      callEvent: sinon.stub(),
      stack: {
        getFrames: sinon.stub().returns([]),
        top: sinon.stub().returns(referenceFrame),
      },
      getHandlers: sinon.stub().returns(handlers),
      hasEnded: sinon.stub().returns(false),
      getAction: sinon.stub().returns(Action.REQUEST),
      setAction: sinon.stub(),
      hasTimedOut: sinon.stub().returns(false),
    };
    const node = {};
    const program = { getNode: sinon.stub().returns(node) };
    const variableState = {};

    // the fact that finishes means that i > HANDLER_OVERFLOW was hit
    await cycleHandler(runtime as any, program as any, variableState as any);
    expect(runtime.setAction.args).to.eql([[Action.RUNNING]]);
  });
});
