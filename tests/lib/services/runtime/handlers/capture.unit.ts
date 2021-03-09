import { IntentRequest, NodeType, Request, RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CaptureHandler } from '@/lib/services/runtime/handlers/capture';

const intentRequest: IntentRequest = {
  type: RequestType.INTENT,
  payload: {
    query: '',
    intent: {
      name: 'name',
    },
    entities: [],
    confidence: 0.86123,
  },
};

const getMockDependencies = ({ request = intentRequest }: { request?: Request } = {}) => ({
  node: {
    type: NodeType.CAPTURE,
    variable: 'var',
  } as any,
  runtime: {
    trace: {
      debug: sinon.stub().resolves(),
      addTrace: sinon.stub().resolves(),
    },
    getAction: sinon.stub().returns(null),
    setAction: sinon.stub(),
    getRequest: sinon.stub().returns(request),
  } as any,
  variables: {
    set: sinon.stub().resolves(),
  } as any,

  utils: {
    repeatHandler: {
      canHandle: sinon.stub().returns(false),
    },
    commandHandler: {
      canHandle: sinon.stub().returns(false),
    },
  } as any,
});

describe('Capture handler', () => {
  it('can handle', async () => {
    const deps = getMockDependencies();

    const handler = CaptureHandler(deps.utils);

    expect(handler.canHandle(deps.node, deps.runtime, deps.variables, null as any)).to.eql(true);
  });

  it("can't handle", async () => {
    const deps = getMockDependencies();

    const handler = CaptureHandler(deps.utils);

    expect(handler.canHandle({ ...deps.node, variable: null }, deps.runtime, deps.variables, null as any)).to.eql(false);
  });
});
