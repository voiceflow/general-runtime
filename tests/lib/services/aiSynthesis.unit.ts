import { expect } from 'chai';

import { removePromptLeak } from '@/lib/services/aiSynthesis/utils';

describe('aiSynthesis unit tests', () => {
  it('removes prompt leaks', async () => {
    expect(removePromptLeak('foo bar')).to.eql('foo bar');
    expect(removePromptLeak('foo bar ##query baz')).to.eql('foo bar');
    expect(removePromptLeak('foo bar \n### instructions ##Query baz')).to.eql('foo bar');
    expect(removePromptLeak('foo bar \n##Query: baz \n qux \n\n quux')).to.eql('foo bar');
  });
});
