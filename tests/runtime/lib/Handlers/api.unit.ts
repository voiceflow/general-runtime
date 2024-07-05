import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import { Request, Response } from 'node-fetch';
import sinon from 'sinon';

import { Store } from '@/runtime';
import APIHandler, { USER_AGENT, USER_AGENT_KEY } from '@/runtime/lib/Handlers/api';
import * as APIUtils from '@/runtime/lib/Handlers/api/utils';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import { mockTime } from '@/tests/lib/services/dialog/fixture';

const ACTION_DATA = { foo: 'bar', url: 'http://test.com/test' };
const AGENT_ACTION_DATA = {
  foo: 'bar',
  url: 'http://test.com/test',
  headers: [{ key: USER_AGENT_KEY, val: USER_AGENT }],
};
const config = {
  requestTimeoutMs: 20_000,
  maxResponseBodySizeBytes: 1_000_000,
  maxRequestBodySizeBytes: 1_000_000,
};

describe('API Handler unit tests', () => {
  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      const apiHandler = APIHandler(config);
      expect(apiHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('false with type integrations', () => {
      const apiHandler = APIHandler(config);
      expect(apiHandler.canHandle({ type: 'integrations' } as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', () => {
      const apiHandler = APIHandler(config);
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
      const resultVariables = {
        data: {
          variables: { foo: 'bar' },
          request: new Request('https://example.com/?a=1'),
          response: new Response('response body', {
            status: 200,
            statusText: 'OK',
          }),
        },
      };
      const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
        id: 'step-id',
        type: BaseNode.NodeType.API,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered', BaseNode.NodeType.API]]);
      expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, config]]);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('calls local', async () => {
      const apiHandler = APIHandler(config);
      const resultVariables = {
        data: {
          variables: { foo: 'bar' },
          request: new Request('https://example.com/?a=1'),
          response: new Response('response body', {
            status: 200,
            statusText: 'OK',
          }),
        },
      };
      const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
      };
      const runtime = {
        trace: {
          debug: sinon.stub(),
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call successfully triggered', BaseNode.NodeType.API]]);
      expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, config]]);
      expect(variables.merge.args).to.eql([[resultVariables.data.variables]]);
    });

    it('error status without fail_id', async () => {
      const apiHandler = APIHandler(config);
      const resultVariables = {
        data: {
          variables: {},
          request: new Request('https://example.com/?a=1'),
          response: new Response('response body', {
            status: 401,
            statusText: 'Unauthorized',
          }),
        },
      };
      sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        selected_integration: 'Custom API',
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['API call error - \n{"status":401}', BaseNode.NodeType.API]]);
    });

    it('error status with fail_id', async () => {
      const apiHandler = APIHandler(config);
      const resultVariables = {
        data: {
          variables: {},
          request: new Request('https://example.com/?a=1'),
          response: new Response('response body', {
            status: 401,
            statusText: 'Unauthorized',
          }),
        },
      };
      sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

      const node = {
        fail_id: 'fail-id',
        selected_integration: 'Custom API',
        selected_action: 'Make a GET Request',
        action_data: ACTION_DATA,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = { getState: sinon.stub().returns({}), merge: sinon.stub() };

      expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.fail_id);
      expect(runtime.trace.debug.args).to.eql([['API call error - \n{"status":401}', BaseNode.NodeType.API]]);
    });

    describe('fails', () => {
      it('without fail_id', async () => {
        const apiHandler = APIHandler(config);
        const axiosErr = { response: { data: 'http call error' } };
        const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').throws(axiosErr);

        const node = { selected_integration: 'Zapier', selected_action: 'Start a Zap', action_data: ACTION_DATA };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.trace.debug.args).to.eql([
          [`API call failed - Error: \n${JSON.stringify(axiosErr)}`, BaseNode.NodeType.API],
        ]);
        expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, config]]);
      });

      it('with fail_id', async () => {
        const apiHandler = APIHandler(config);
        const makeAPICallStub = sinon.stub(APIUtils, 'makeAPICall').throws('error5');

        const node = {
          fail_id: 'fail-id',
          selected_integration: 'Zapier',
          selected_action: 'Start a Zap',
          action_data: ACTION_DATA,
        };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { getState: sinon.stub().returns({}) };

        expect(await apiHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
          node.fail_id
        );
        expect(makeAPICallStub.args).to.eql([[AGENT_ACTION_DATA, runtime, config]]);
        expect(runtime.trace.debug.args).to.eql([
          ['API call failed - Error: \n{"name":"error5"}', BaseNode.NodeType.API],
        ]);
      });

      it('creates non-verbose runtime logs', async () => {
        const config = 'config';
        const apiHandler = APIHandler(config as any);
        const resultVariables = {
          data: {
            // variables: { foo: 'bar' },
            request: new Request('https://example.com/?a=1', {
              headers: {
                'Request-Header': 'request-header-value',
              },
            }),
            response: new Response('response body', {
              status: 200,
              statusText: 'OK',
              headers: {
                'Response-Header': 'response-header-value',
              },
            }),
          },
        };

        sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

        const node = {
          selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
          selected_action: 'Make a GET Request',
          action_data: ACTION_DATA,
          id: 'step-id',
          type: BaseNode.NodeType.API,
        };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

        await apiHandler.handle(node as any, runtime as any, new Store(), null as any);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.api',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  componentName: RuntimeLogs.Kinds.StepLogKind.API,
                  stepID: 'step-id',
                  request: {
                    body: null,
                    bodyType: null,
                    headers: null,
                    method: 'GET',
                    query: null,
                    url: 'https://example.com/?a=1',
                  },
                  response: {
                    body: null,
                    headers: null,
                    statusCode: 200,
                    statusText: 'OK',
                  },
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });
      it('creates verbose runtime logs', async () => {
        const config = 'config';
        const apiHandler = APIHandler(config as any);
        const resultVariables = {
          data: {
            // variables: { foo: 'bar' },
            request: new Request('https://example.com/?a=1', {
              headers: {
                'Request-Header': 'request-header-value',
              },
            }),
            response: {
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: {
                'response-header': 'response-header-value',
                'content-type': 'application/json',
              },
            },
            responseJSON: {
              foo: 'bar',
            },
          },
        };

        sinon.stub(APIUtils, 'makeAPICall').resolves(resultVariables.data as any);

        const node = {
          selected_integration: BaseNode.Utils.IntegrationType.CUSTOM_API,
          selected_action: 'Make a GET Request',
          action_data: ACTION_DATA,
          id: 'step-id',
          type: BaseNode.NodeType.API,
        };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        runtime.debugLogging.maxLogLevel = RuntimeLogs.LogLevel.VERBOSE;

        await apiHandler.handle(node as any, runtime as any, new Store(), null as any);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.api',
                level: RuntimeLogs.LogLevel.VERBOSE,
                message: {
                  componentName: RuntimeLogs.Kinds.StepLogKind.API,
                  stepID: 'step-id',
                  request: {
                    body: null,
                    bodyType: null,
                    headers: {
                      'request-header': 'request-header-value',
                    },
                    method: 'GET',
                    query: {
                      a: '1',
                    },
                    url: 'https://example.com/?a=1',
                  },
                  response: {
                    body: JSON.stringify({
                      foo: 'bar',
                    }),
                    headers: {
                      'content-type': 'application/json',
                      'response-header': 'response-header-value',
                    },
                    statusCode: 200,
                    statusText: 'OK',
                  },
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });
    });
  });
});
