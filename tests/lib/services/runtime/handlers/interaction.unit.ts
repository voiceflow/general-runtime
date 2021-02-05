import { GeneralRequest, IntentRequest, NodeType, RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { InteractionHandler } from '@/lib/services/runtime/handlers/interaction';

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

const getMockDependencies = ({ request = intentRequest }: { request?: GeneralRequest } = {}) => ({
  node: {
    type: NodeType.CAPTURE,
    interactions: [],
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
    noMatchHandler: {
      canHandle: sinon.stub().returns(false),
    },
  } as any,
});

describe('Interaction handler', () => {
  it('can handle', async () => {
    const deps = getMockDependencies();

    const handler = InteractionHandler(deps.utils);

    expect(handler.canHandle(deps.node, deps.runtime, deps.variables, null as any)).to.eql(true);
  });

  it("can't handle", async () => {
    const deps = getMockDependencies();

    const handler = InteractionHandler(deps.utils);

    expect(handler.canHandle({ ...deps.node, interactions: null }, deps.runtime, deps.variables, null as any)).to.eql(false);
  });
});
