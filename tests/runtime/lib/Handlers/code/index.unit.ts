import { BaseNode, BaseProject } from '@voiceflow/base-types';
import { DeepPartial } from '@voiceflow/common';
import { createMockFactory, DeepMocked } from '@voiceflow/test-common';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import { Runtime, Stack, Store } from '@/runtime';
import CodeHandler from '@/runtime/lib/Handlers/code';
import ProgramModel from '@/runtime/lib/Program';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import Trace from '@/runtime/lib/Runtime/Trace';

describe('CodeHandler', () => {
  const sandbox = sinon.createSandbox();

  const createMock = createMockFactory({ fn: sandbox.stub });

  let mockRuntime: DeepMocked<Runtime>;
  let mockNode: DeepMocked<BaseNode.Code.Node>;
  let mockProgram: DeepMocked<ProgramModel>;

  beforeEach(() => {
    mockRuntime = createMock<Runtime>({
      getVersionID: () => 'version-id',
      project: createMock<DeepPartial<BaseProject.Project>>({ _id: 'project-id' }) as any,
      trace: createMock<Trace>(),
      debugLogging: createMock<DebugLogging>(),
      stack: createMock<Stack>(),
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

    it('remote succeeds', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      sandbox.stub(axios, 'post').resolves({ data: { a: 1 } });

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.success_id);
      expect(store.get('a')).to.eq(1);
    });

    it('remote fails', async () => {
      const variables = { a: 0 };
      const store = new Store(variables);

      sandbox.stub(axios, 'post').rejects(new Error('error'));

      const result = await handler.handle(mockNode, mockRuntime, store, mockProgram);
      expect(result).to.eql(mockNode.fail_id);
    });
  });
});
