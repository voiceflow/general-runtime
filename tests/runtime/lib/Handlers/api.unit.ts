import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import APIHandler, { USER_AGENT, USER_AGENT_KEY } from '@/runtime/lib/Handlers/api';
import * as APIUtils from '@/runtime/lib/Handlers/api/utils';

const ACTION_DATA = { foo: 'bar' };
const AGENT_ACTION_DATA = { foo: 'bar', headers: [{ key: USER_AGENT_KEY, val: USER_AGENT }] };

describe('API Handler unit tests', () => {
  describe('canHandle', () => {
    it('false', () => {
      const apiHandler = APIHandler();
      expect(apiHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('false with type integrations', () => {
      const apiHandler = APIHandler();
      expect(apiHandler.canHandle({ type: 'integrations' } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      const apiHandler = APIHandler();
      expect(
        apiHandler.canHandle(
          { type: 'integrations', selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    afterEach(() => {
      sinon.restore();
    });
    it('success', async () => {
      const config = 'config';
      const apiHandler = APIHandler(config as any);
      const resultVariables = { data: { variables: { foo: 'bar' }, response: { status: 200 } } };
      const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
      };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered', BaseNode.NodeType.API]]);
      expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, config]]);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('calls local', async () => {
      const apiHandler = APIHandler();
      const resultVariables = { data: { variables: { foo: 'bar' }, response: { status: 200 } } };
      const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
      };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered', BaseNode.NodeType.API]]);
      expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, {}]]);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('error status without fail_id', async () => {
      const apiHandler = APIHandler();
      const resultVariables = { data: { variables: {}, response: { status: 401 } } };
      sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = { selected_integration: 'Custom API', selected_action: 'Make a GET Request', action_data: ACTION_DATA };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([[`API call returned status code ${resultVariables.data.response.status}`, BaseNode.NodeType.API]]);
    });

    it('error status with fail_id', async () => {
      const apiHandler = APIHandler();
      const resultVariables = { data: { variables: {}, response: { status: 401 } } };
      sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = { fail_id: 'fail-id', selected_integration: 'Custom API', selected_action: 'Make a GET Request', action_data: ACTION_DATA };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.fail_id);
      expect(runtime.trace.debug.args).to.eql([[`API call returned status code ${resultVariables.data.response.status}`, BaseNode.NodeType.API]]);
    });

    describe('fails', () => {
      it('without fail_id', async () => {
        const apiHandler = APIHandler();
        const axiosErr = { response: { data: 'http call error' } };
        const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').throws(axiosErr);

        const node = { selected_integration: 'Zapier', selected_action: 'Start a Zap', action_data: ACTION_DATA };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.trace.debug.args).to.eql([[`API call failed - Error: \n"${axiosErr.response.data}"`, BaseNode.NodeType.API]]);
        expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, {}]]);
      });

      it('with fail_id', async () => {
        const apiHandler = APIHandler();
        const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').throws('error5');

        const node = { fail_id: 'fail-id', selected_integration: 'Zapier', selected_action: 'Start a Zap', action_data: ACTION_DATA };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.fail_id);
        expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, {}]]);
        expect(runtime.trace.debug.args).to.eql([['API call failed - Error: \n{"name":"error5"}', BaseNode.NodeType.API]]);
      });
    });
  });
});
