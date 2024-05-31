import { expect } from 'chai';
import { ZodError } from 'zod';

import { executePromptWrapper } from '@/lib/services/predictor/prompt-wrapper-executor';

describe('exec', () => {
  it('works', async () => {
    const result = await executePromptWrapper(
      `
        export default function (args) {
          return {
            prompt: String(args.a + 1)
          }
        }
      `,
      {
        a: 2,
      }
    );

    expect(result.prompt).to.equal('3');
  });

  describe('fails', () => {
    it('on non string return type', async () => {
      await expect(
        executePromptWrapper(
          `
          export default function (args) {
            return {
              prompt: args.a + 1
            }
          }
        `,
          {
            a: 2,
          }
        )
      ).eventually.to.be.rejectedWith(ZodError);
    });
  });
});
