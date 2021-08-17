import { Node } from '@voiceflow/base-types';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import APIHandler from '@/runtime/lib/Handlers/api';
import * as APIUtils from '@/runtime/lib/Handlers/api/utils';

const DEFAULT_OPTIONS = { customAPIEndpoint: 'https://foo' };

describe('API Handler unit tests', () => {
  describe('canHandle', () => {
    it('false', () => {
      const apiHandler = APIHandler(DEFAULT_OPTIONS);
      expect(apiHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('false with type integrations', () => {
      const apiHandler = APIHandler(DEFAULT_OPTIONS);
      expect(apiHandler.canHandle({ type: 'integrations' } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      const apiHandler = APIHandler(DEFAULT_OPTIONS);
      expect(
        apiHandler.canHandle(
          { type: 'integrations', selected_integration: Node.Utils.IntegrationType.CUSTOM_API } as any,
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
      const customAPIEndpoint = 'https://foo';
      const apiHandler = APIHandler({ customAPIEndpoint });
      const resultVariables = { data: { variables: { foo: 'bar' }, response: { status: 200 } } };
      const axiosPost = sinon.stub(axios, 'post').resolves(resultVariables);

      const node = { selected_integration: Node.Utils.IntegrationType.CUSTOM_API, selected_action: 'Make a GET Request' };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered']]);
      expect(axiosPost.args).to.eql([[`${customAPIEndpoint}/custom/make_api_call`, undefined]]);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('calls local', async () => {
      const apiHandler = APIHandler();
      const resultVariables = { data: { variables: { foo: 'bar' }, response: { status: 200 } } };
      const axiosPost = sinon.stub(axios, 'post').resolves(resultVariables);
      const local = sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = { selected_integration: Node.Utils.IntegrationType.CUSTOM_API, selected_action: 'Make a GET Request', action_data: 'actionData' };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered']]);
      expect(local.args).to.eql([[node.action_data]]);
      expect(axiosPost.callCount).to.eql(0);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('error status without fail_id', async () => {
      const apiHandler = APIHandler(DEFAULT_OPTIONS);
      const resultVariables = { data: { variables: {}, response: { status: 401 } } };
      sinon.stub(axios, 'post').resolves(resultVariables);

      const node = { selected_integration: 'Custom API', selected_action: 'Make a GET Request' };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([[`API call returned status code ${resultVariables.data.response.status}`]]);
    });

    it('error status with fail_id', async () => {
      const apiHandler = APIHandler(DEFAULT_OPTIONS);
      const resultVariables = { data: { variables: {}, response: { status: 401 } } };
      sinon.stub(axios, 'post').resolves(resultVariables);

      const node = { fail_id: 'fail-id', selected_integration: 'Custom API', selected_action: 'Make a GET Request' };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.fail_id);
      expect(runtime.trace.debug.args).to.eql([[`API call returned status code ${resultVariables.data.response.status}`]]);
    });

    describe('fails', () => {
      it('without fail_id', async () => {
        const apiHandler = APIHandler(DEFAULT_OPTIONS);
        const axiosErr = { response: { data: 'http call error' } };
        const axiosPost = sinon.stub(axios, 'post').throws(axiosErr);

        const node = { selected_integration: 'Zapier', selected_action: 'Start a Zap' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.trace.debug.args).to.eql([[`API call failed - Error: \n"${axiosErr.response.data}"`]]);
        expect(axiosPost.args).to.eql([[`${DEFAULT_OPTIONS.customAPIEndpoint}/custom/make_api_call`, undefined]]);
      });

      it('with fail_id', async () => {
        const apiHandler = APIHandler(DEFAULT_OPTIONS);
        const axiosPost = sinon.stub(axios, 'post').throws('error5');

        const node = { fail_id: 'fail-id', selected_integration: 'Zapier', selected_action: 'Start a Zap' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.fail_id);
        expect(axiosPost.args).to.eql([[`${DEFAULT_OPTIONS.customAPIEndpoint}/custom/make_api_call`, undefined]]);
        expect(runtime.trace.debug.args).to.eql([['API call failed - Error: \n{"name":"error5"}']]);
      });
    });
  });
});
