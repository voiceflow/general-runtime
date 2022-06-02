import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import VisualHandler from '@/lib/services/runtime/handlers/visual';

const getMockDependencies = () => ({
  node: {
    type: BaseNode.NodeType.VISUAL,
    data: 'data',
  } as any,
  runtime: {
    trace: {
      debug: sinon.stub().resolves(),
      addTrace: sinon.stub().resolves(),
    },
  } as any,
});

describe('Visual handler', () => {
  it('can handle', async () => {
    const deps = getMockDependencies();

    const handler = VisualHandler();

    expect(handler.canHandle(deps.node, deps.runtime, null as any, null as any)).to.eql(true);
  });

  it("can't handle", async () => {
    const deps = getMockDependencies();

    const handler = VisualHandler();

    expect(handler.canHandle({ ...deps.node, data: null }, deps.runtime, null as any, null as any)).to.eql(false);
    expect(handler.canHandle({ ...deps.node, type: null }, deps.runtime, null as any, null as any)).to.eql(false);
  });

  it('handle', async () => {
    const deps = getMockDependencies();

    const handler = VisualHandler();

    handler.handle(deps.node, deps.runtime, null as any, null as any);

    expect(deps.runtime.trace.debug.args).to.eql([['__visual__ - entered', BaseNode.NodeType.VISUAL]]);
    expect(deps.runtime.trace.addTrace.args).to.eql([
      [{ type: BaseNode.Utils.TraceType.VISUAL, payload: deps.node.data }],
    ]);
  });
});
