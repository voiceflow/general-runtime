import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import Frame from '@/runtime/lib/Runtime/Stack/Frame/index';

describe('Runtime Stack Frame unit tests', () => {
  it('getState', () => {
    const options = {
      nodeID: 'node-id',
      programID: 'program-id',
      storage: { s1: 'v1' },
      commands: [{}, {}],
      variables: { v1: 'v1' },
    };
    const frame = new Frame(options);
    expect(frame.getState()).to.eql({
      nodeID: options.nodeID,
      programID: options.programID,
      storage: options.storage,
      commands: options.commands,
      variables: options.variables,
    });
  });

  it('getNodeID', () => {
    const nodeID = 'node-id';
    const frame = new Frame({ nodeID } as any);
    expect(frame.getNodeID()).to.eql(nodeID);
  });

  it('setNodeID', () => {
    const nodeID = 'node-id';
    const frame = new Frame({} as any);
    frame.setNodeID(nodeID);
    expect(_.get(frame, 'nodeID')).to.eql(nodeID);
  });

  it('getProgramID', () => {
    const programID = 'program-id';
    const frame = new Frame({ programID } as any);
    expect(frame.getProgramID()).to.eql(programID);
  });

  it('setProgramID', () => {
    const programID = 'program-id';
    const frame = new Frame({} as any);
    frame.setProgramID(programID);
    expect(_.get(frame, 'programID')).to.eql(programID);
  });

  it('getCommands', () => {
    const commands = [{ c1: 'v1' }, { c2: 'v2' }];
    const frame = new Frame({ commands } as any);
    expect(frame.getCommands()).to.eql(commands);
  });

  describe('initialize', () => {
    it('already initialized', () => {
      const frame = new Frame({} as any);
      _.set(frame, 'initialized', true);
      frame.initialize(null as any);
      expect(frame.getNodeID()).to.eql(undefined);
    });

    it('init nodeID', () => {
      const frame = new Frame({} as any);
      const commands = [{ c1: 'v1' }, { c2: 'v2' }];
      const startNodeID = 'start-node-id';
      const variables = ['var1', 'var2'];
      const program = {
        getCommands: sinon.stub().returns(commands),
        getStartNodeID: sinon.stub().returns(startNodeID),
        getVariables: sinon.stub().returns(variables),
      };

      frame.initialize(program as any);

      expect(frame.getNodeID()).to.eql(startNodeID);
      expect(frame.getCommands()).to.eql(commands);
      expect(frame.getState().variables).to.eql({ var1: 0, var2: 0 });
    });

    it('nodeID already set', () => {
      const nodeID = 'node-id';
      const frame = new Frame({ nodeID } as any);
      const startNodeID = 'start-node-id';
      const program = {
        getCommands: sinon.stub().returns([]),
        getStartNodeID: sinon.stub().returns(startNodeID),
        getVariables: sinon.stub().returns([]),
      };

      frame.initialize(program as any);

      expect(frame.getNodeID()).to.eql(nodeID);
      expect(_.get(frame, 'startNodeID')).to.eql(startNodeID);
    });
  });
});
