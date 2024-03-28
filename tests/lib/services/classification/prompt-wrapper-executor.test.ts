import { expect } from 'chai';

import { executePromptWrapper } from '@/lib/services/classification/prompt-wrapper-executor';

describe('exec', () => {
  it('works', async () => {
    const result = await executePromptWrapper(
      `
      export default function (args) {
        return String(args.a + 1)
      }
      `,
      {
        a: 2,
      }
    );

    expect(result).to.equal(3);
  });

  describe('fails', () => {
    it('on non string return type', async () => {
      const result = await executePromptWrapper(
        `
      export default function (args) {
        return args.a + 1
      }
      `,
        {
          a: 2,
        }
      );

      expect(result).to.equal(3);
    });
  });
});
