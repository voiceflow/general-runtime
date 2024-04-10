import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { EventType } from '@/runtime/lib/Lifecycle';
import ProgramModel from '@/runtime/lib/Program';
import ProgramManager from '@/runtime/lib/Runtime/utils/programManager';

describe('Runtime utils ProgramManager', () => {
  afterEach(() => sinon.restore());

  it('get', async () => {
    const diagramID = 'diagram-id';
    const versionID = 'version-id';
    const data = {
      id: diagramID,
      diagramID,
      startId: 'start-id',
      variables: { var: 'val' },
      lines: [{ b1: 'v1' }, { b2: 'v2' }],
      commands: [{ c1: 'v1' }],
    };
    const runtime = {
      api: { getProgram: sinon.stub().resolves(data) },
      callEvent: sinon.stub(),
    };
    const programManager = new ProgramManager(runtime as any);

    const program = await programManager.get(versionID, diagramID);

    expect(program.getDiagramID()).to.eql(diagramID);
    expect(program.getStartNodeID()).to.eql(data.startId);
    expect(program.getVariables()).to.eql(data.variables);
    expect(program.getRaw()).to.eql(data.lines);
    expect(program.getCommands()).to.eql(data.commands);
    expect(runtime.api.getProgram.args).to.eql([[versionID, diagramID]]);
    expect(runtime.callEvent.args[0][0]).to.eql(EventType.programWillFetch);
    expect(runtime.callEvent.args[0][1].diagramID).to.eql(diagramID);
    expect(runtime.callEvent.args[1]).to.eql([
      EventType.programDidFetch,
      { diagramID, versionID, program },
    ]);

    expect(runtime.callEvent.args[0][1].override()).to.eql(undefined);
  });

  it('has to fetch program', async () => {
    const program = { id: 'id' };
    const runtime = {
      callEvent: sinon.stub(),
      api: { getProgram: sinon.stub().resolves(program) },
    };
    const programManager = new ProgramManager(runtime as any);

    const diagramID = 'diagram-id';
    const versionID = 'version-id';
    const programModel = new ProgramModel(program as any);
    expect(await programManager.get(versionID, diagramID)).to.eql(programModel);
    expect(_.get(programManager, 'cachedProgram')).to.eql(programModel);
    expect(runtime.callEvent.callCount).to.eql(2);
    expect(runtime.callEvent.args[0][0]).to.eql(EventType.programWillFetch);
    expect(Object.keys(runtime.callEvent.args[0][1])).to.eql([
      'versionID',
      'diagramID',
      'override',
    ]);
    expect(runtime.callEvent.args[0][1].diagramID).to.eql(diagramID);
    expect(typeof runtime.callEvent.args[0][1].override).to.eql('function');
    expect(runtime.callEvent.args[1]).to.eql([
      EventType.programDidFetch,
      { versionID, diagramID, program: programModel },
    ]);
  });

  it('program gets injected', async () => {
    const runtime = { callEvent: sinon.stub() };
    const injectedProgramModel = { foo: 'bar' };
    const fakeFn = (
      _event: string,
      utils: { diagramID: string; override: (...args: any[]) => any }
    ) => {
      utils.override(injectedProgramModel);
    };

    runtime.callEvent.onFirstCall().callsFake(fakeFn);

    const programManager = new ProgramManager(runtime as any);
    expect(await programManager.get('version-id', 'diagram-id')).to.eql(injectedProgramModel);
  });

  it('program is in cache', async () => {
    const runtime = { callEvent: sinon.stub(), api: { getProgram: sinon.stub().resolves({}) } };
    const programManager = new ProgramManager(runtime as any);

    const programID = 'program-id';
    const diagramID = 'diagram-id';
    const versionID = 'version-id';

    _.set(
      programManager,
      'cachedProgram',
      new ProgramModel({ id: programID, diagramID, versionID } as any)
    );

    const program = await programManager.get(versionID, diagramID);
    expect(program.getID()).to.eql(programID);
  });
});
