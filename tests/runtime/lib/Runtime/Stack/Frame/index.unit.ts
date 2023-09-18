import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import Frame from '@/runtime/lib/Runtime/Stack/Frame/index';

describe('Runtime Stack Frame unit tests', () => {
  it('getState', () => {
    const options = {
      nodeID: 'node-id',
      diagramID: 'diagram-id',
      storage: { s1: 'v1' },
      commands: [{ type: 'c1' }, { type: 'c2' }],
      variables: { v1: 'v1' },
    };
    const frame = new Frame(options);
    expect(frame.getState()).to.eql({
      nodeID: options.nodeID,
      diagramID: options.diagramID,
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

  it('getDiagramID', () => {
    const diagramID = 'diagram-id';
    const frame = new Frame({ diagramID } as any);
    expect(frame.getDiagramID()).to.eql(diagramID);
  });

  it('setDiagramID', () => {
    const diagramID = 'diagram-id';
    const frame = new Frame({} as any);
    frame.setDiagramID(diagramID);
    expect(_.get(frame, 'diagramID')).to.eql(diagramID);
  });

  it('getCommands', () => {
    const commands = [{ c1: 'v1' }, { c2: 'v2' }];
    const frame = new Frame({ commands } as any);
    expect(frame.getCommands()).to.eql(commands);
  });

  describe('hydrate', () => {
    it('already hydrated', () => {
      const frame = new Frame({} as any);
      _.set(frame, 'hydrated', true);
      frame.hydrate(null as any);
      expect(frame.getNodeID()).to.eql(undefined);
    });

    it('init nodeID', () => {
      const frame = new Frame({} as any);
      const commands = [{ c1: 'v1' }, { c2: 'v2' }];
      const name = 'flow name';
      const startNodeID = 'start-node-id';
      const variables = ['var1', 'var2'];
      const program = {
        getName: sinon.stub().returns(name),
        getCommands: sinon.stub().returns(commands),
        getStartNodeID: sinon.stub().returns(startNodeID),
        getVariables: sinon.stub().returns(variables),
      };

      frame.hydrate(program as any);

      expect(frame.getName()).to.eql(name);
      expect(frame.getNodeID()).to.eql(startNodeID);
      expect(frame.getCommands()).to.eql(commands);
      expect(frame.getState().variables).to.eql({ var1: 0, var2: 0 });
    });

    it('nodeID already set', () => {
      const nodeID = 'node-id';
      const frame = new Frame({ nodeID } as any);
      const startNodeID = 'start-node-id';
      const program = {
        getName: sinon.stub().returns(undefined),
        getCommands: sinon.stub().returns([]),
        getStartNodeID: sinon.stub().returns(startNodeID),
        getVariables: sinon.stub().returns([]),
      };

      frame.hydrate(program as any);

      expect(frame.getNodeID()).to.eql(nodeID);
      expect(_.get(frame, 'startNodeID')).to.eql(startNodeID);
    });
  });
});
