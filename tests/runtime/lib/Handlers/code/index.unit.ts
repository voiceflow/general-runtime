import { BaseNode, BaseProject } from '@voiceflow/base-types';
import { DeepPartial } from '@voiceflow/common';
import { createMockFactory, DeepMocked } from '@voiceflow/test-common';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import log from '@/logger';
import { Runtime, Store } from '@/runtime';
import CodeHandler from '@/runtime/lib/Handlers/code';
import * as codeHandlerUtils from '@/runtime/lib/Handlers/code/utils';
import ProgramModel from '@/runtime/lib/Program';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import Trace from '@/runtime/lib/Runtime/Trace';

describe('CodeHandler', () => {
  const sandbox = sinon.createSandbox();

  const createMock = createMockFactory({ fn: sandbox.stub });

  let mockLog: sinon.SinonMock;
  let mockRuntime: DeepMocked<Runtime>;
  let mockNode: DeepMocked<BaseNode.Code.Node>;
  let mockProgram: DeepMocked<ProgramModel>;

  beforeEach(() => {
    mockLog = sandbox.mock(log);

    mockRuntime = createMock<Runtime>({
      getVersionID: () => 'version-id',
      project: createMock<DeepPartial<BaseProject.Project>>({ _id: 'project-id' }) as any,
      trace: createMock<Trace>(),
      debugLogging: createMock<DebugLogging>(),
    });
    mockNode = createMock<BaseNode.Code.Node>({
      id: 'node-id',
      success_id: 'success-id',
      fail_id: 'fail-id',
      code: 'a = 1',
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

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('remote succeeds, ivm succeeds, differing results', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution results between remote and isolated-vm are different');
      sandbox.stub(axios, 'post').resolves({ data: { a: 1 } });
      sandbox.stub(mockNode, 'code').get(() => 'a = 2');

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('remote succeeds, ivm fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution remote succeeded when isolated-vm rejected');
      sandbox.stub(axios, 'post').resolves({ data: { a: 1 } });
      sandbox.stub(mockNode, 'code').get(() => 'throw new Error("error")');

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('remote fails, ivm succeeds', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution remote rejected when isolated-vm succeeded');
      sandbox.stub(axios, 'post').rejects(new Error('error'));

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      mockLog.verify();
    });

    it('remote fails, ivm fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('error').calledWithMatch('Code execution remote and isolated-vm both rejected');
      sandbox.stub(axios, 'post').rejects(new Error('error'));
      sandbox.stub(mockNode, 'code').get(() => 'throw new Error("error")');

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      mockLog.verify();
    });
  });

  describe('vm2 executor', () => {
    const cb = (value: any) => value + 1;
    const handler = CodeHandler({ callbacks: { cb } });

    beforeEach(() => {
      mockNode.code = 'a = cb(a)';
    });

    it('vm2 succeeds, ivm succeeds', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').never();

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('vm2 succeeds, ivm succeeds, differing results', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution results between vm2 and isolated-vm are different');
      sandbox.stub(codeHandlerUtils, 'ivmExecute').resolves({ a: 2 });

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('vm2 succeeds, ivm fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution vm2 succeeded when isolated-vm rejected');
      sandbox.stub(codeHandlerUtils, 'ivmExecute').rejects(new Error('error'));

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
      mockLog.verify();
    });

    it('vm2 fails, ivm succeeds', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('warn').calledWithMatch('Code execution vm2 rejected when isolated-vm succeeded');
      sandbox.stub(codeHandlerUtils, 'vmExecute').rejects(new Error('error'));

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      mockLog.verify();
    });

    it('vm2 fails, ivm fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('error').calledWithMatch('Code execution vm2 and isolated-vm both rejected');
      sandbox.stub(mockNode, 'code').get(() => 'throw new Error("error")');

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      mockLog.verify();
    });

    it('handles infinite loops', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      mockLog.expects('error').calledWithMatch('Error: Script execution timed out');
      sandbox.stub(mockNode, 'code').get(() => 'while (true) {}');

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
      mockLog.verify();
    });
  });
});
