import { expect } from 'chai';

import Program from '@/runtime/lib/Program';

describe('Program unit tests', () => {
  describe('constructor', () => {
    it('default values', () => {
      const program = new Program({ id: 'id', lines: 'nodes' as any, startId: 'start' });
      expect(program.getVariables()).to.eql([]);
      expect(program.getCommands()).to.eql([]);
    });

    it('correct attributes init', () => {
      const id = 'id';
      const nodes = 'nodes';
      const variables = 'variables';
      const commands = 'commands';
      const startId = 'start-id';
      const program = new Program({
        id,
        lines: nodes as any,
        variables: variables as any,
        commands: commands as any,
        startId,
      });
      expect(program.getID()).to.eql(id);
      expect(program.getRaw()).to.eql(nodes);
      expect(program.getVariables()).to.eql(variables);
      expect(program.getCommands()).to.eql(commands);
      expect(program.getStartNodeID()).to.eql(startId);
    });
  });

  describe('getNode', () => {
    it('no nodeID', () => {
      const program = new Program({ id: 'id', lines: null as any, startId: 'start' });
      expect(program.getNode(null)).to.eql(null);
    });

    it('node not found', () => {
      const nodes = {
        1: { one: '1' },
        2: { two: '2' },
      };
      const program = new Program({ id: 'id', lines: nodes as any, startId: 'start' });
      const nodeID = 'random';
      expect(program.getNode(nodeID)).to.eql(null);
    });

    it('returns node correctly', () => {
      const nodes = {
        1: { one: '1' },
        2: { two: '2' },
        3: { three: '3' },
      };
      const program = new Program({ id: 'id', lines: nodes as any, startId: 'start' });
      const nodeID = '2';
      expect(program.getNode(nodeID)).to.eql({ ...nodes[nodeID], id: nodeID });
    });
  });
});
