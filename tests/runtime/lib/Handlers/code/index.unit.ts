import { BaseNode, BaseProject } from '@voiceflow/base-types';
import { DeepPartial } from '@voiceflow/common';
import { createMockFactory, DeepMocked } from '@voiceflow/test-common';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import log from '@/logger';
import { Runtime, Stack, Store } from '@/runtime';
import CodeHandler from '@/runtime/lib/Handlers/code';
import ProgramModel from '@/runtime/lib/Program';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import Trace from '@/runtime/lib/Runtime/Trace';

describe('CodeHandler', () => {
  const sandbox = sinon.createSandbox();

  const createMock = createMockFactory({ fn: sandbox.stub });

  let mockLog: sinon.SinonMock;
  let mockRuntime: DeepMocked<Runtime>;
  let mockProgram: DeepMocked<ProgramModel>;

  beforeEach(() => {
    mockLog = sandbox.mock(log);

    mockRuntime = createMock<Runtime>({
      getVersionID: () => 'version-id',
      project: createMock<DeepPartial<BaseProject.Project>>({ _id: 'project-id' }) as any,
      trace: createMock<Trace>(),
      debugLogging: createMock<DebugLogging>(),
      stack: createMock<Stack>(),
    });
    mockProgram = createMock<ProgramModel>();
  });

  afterEach(() => {
    sandbox.reset();
    sandbox.restore();
  });

  describe('remote executor', () => {
    const handler = CodeHandler({ endpoint: 'http://localhost:3000' });

    it('remote succeeds, ivm succeeds', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').never();
      sandbox.stub(axios, 'post').resolves({ data: { a: 1 } });

      const mockNode = createMock<BaseNode.Code.Node>({
        id: '66cb7b390000000000000000',
        success_id: 'success-id',
        fail_id: 'fail-id',
        code: 'a = 1',
      });

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('ivm fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      const mockNode = createMock<BaseNode.Code.Node>({
        // dated 2024-08-25
        id: '66cb7b390000000000000000',
        success_id: 'success-id',
        fail_id: 'fail-id',
        code: `let buff = new Buffer(user_id, 'base64');`,
      });

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      expect(store.get('a')).to.eq(0);
      mockLog.verify();
    });

    it('remote succeed', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      const mockNode = createMock<BaseNode.Code.Node>({
        // dated 2024-07-25
        id: '66a29cb90000000000000000',
        success_id: 'success-id',
        fail_id: 'fail-id',
        code: `let buff = new Buffer(user_id, 'base64');`,
      });

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      expect(store.get('a')).to.eq(0);
      mockLog.verify();
    });

    it('bad node id', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      sandbox.mock(log).expects('warn').once().calledOnceWith('unable to parse node id: garbage');

      const mockNode = createMock<BaseNode.Code.Node>({
        // dated 2024-07-25
        id: 'garbage',
        success_id: 'success-id',
        fail_id: 'fail-id',
        code: `a = 5`,
      });

      await handler.handle(mockNode, mockRuntime, store, mockProgram);
      mockLog.verify();
    });
  });
});
