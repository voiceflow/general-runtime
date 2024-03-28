import ivm, { Reference } from 'isolated-vm';

import logger from '@/logger';

// @ts-expect-error temporarily unsueed
const isStringReference = (arg: Reference<unknown>): arg is Reference<string> => arg.typeof === 'string';

export async function executePromptWrapper(wrapperCode: string, args: any): Promise<string> {
  const isolate = new ivm.Isolate({
    memoryLimit: 100,
  });
  const context = await isolate.createContext();

  // TODO: this is the same type as the return from mainModule and not a Reference
  // eslint-disable-next-line no-async-promise-executor
  const result = await new Promise<Reference<unknown>>(async (resolve, reject) => {
    try {
      await context.evalClosure(
        `
              resolve = function(...args) {
                  return $0.apply(undefined, args, { arguments: { copy: true }});
              }
              reject = function(...args) {
                  return $1.apply(undefined, args, { arguments: { copy: true }});
              }
          `,
        [resolve, reject],
        { arguments: { reference: true } }
      );

      await context.global.set('args', args, { copy: true });

      const promptModule = await isolate.compileModule(wrapperCode);

      await promptModule.instantiate(context, () => {
        throw new Error('cant import');
      });

      const mainModule = await isolate.compileModule(`
        import promptWrapper from 'user-prompt-wrapper';
          (async function () {
            try {
                const result = await promptWrapper(args);
                resolve(result.prompt);
            } catch (err) {
                reject(err);
            }
        })();
        `);

      await mainModule.instantiate(context, (specifier) => {
        if (specifier === 'user-prompt-wrapper') {
          return promptModule;
        }
        throw new Error('bad import');
      });

      await mainModule.evaluate({
        reference: true,
        timeout: 1000,
      });
    } catch (err) {
      reject(err);
    }
  });

  // if (!isStringReference(result)) {
  if (typeof result !== 'string') {
    logger.info({ result: JSON.stringify(result, null, 2) });
    throw new Error('bad result');
  }

  // return result.copy();
  return result;
}
