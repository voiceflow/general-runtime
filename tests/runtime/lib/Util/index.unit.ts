import { expect } from 'chai';
import sinon from 'sinon';

import { extractFrameCommand } from '@/runtime/lib/Util';

describe('Util unit tests', () => {
  describe('extractFrameCommand', () => {
    it('matched', () => {
      const frames = [{ getCommands: sinon.stub().returns(['c1', 'c2']) }, { getCommands: sinon.stub().returns(['c3', 'c4']) }];
      const stack = { getFrames: sinon.stub().returns(frames) };
      const matcher = (command: string, match: string) => command === match;
      const match = 'c4';
      expect(extractFrameCommand(stack as any, matcher as any, match)).to.eql({ index: 1, command: match });
    });

    it('not matched', () => {
      const stack = { getFrames: sinon.stub().returns([{ getCommands: sinon.stub().returns(['c1', 'c2']) }]) };
      const matcher = () => false;
      expect(extractFrameCommand(stack as any, matcher as any)).to.eql(null);
    });
  });
});
