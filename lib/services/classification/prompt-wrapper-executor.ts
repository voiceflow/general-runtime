import { randomUUID } from 'crypto';
import ivm from 'isolated-vm';
import withResolvers from 'promise.withresolvers';

import { EXECUTION_TIMEOUT_MS, MEMORY_LIMIT_MB } from './promot-wrapper.const';
import { PromptWrapperResult } from './prompt-wrapper.dto';

export async function executePromptWrapper(wrapperCode: string, args: any): Promise<PromptWrapperResult> {
  const isolate = new ivm.Isolate({
    memoryLimit: MEMORY_LIMIT_MB,
  });
  const context = await isolate.createContext();

  // Obfuscate the executor function names to avoid conflicts with user defined code
  const id = randomUUID().replace(/\W/g, '');
  const promptWrapperName = `promptWrapper${id}`;
  const resolveName = `resolve${id}`;
  const rejectName = `reject${id}`;
  const argsName = `args${id}`;

  const resolver = withResolvers(Promise);

  try {
    await context.evalClosure(
      `
        ${resolveName} = function(...args) {
          return $0.apply(undefined, args, { arguments: { copy: true }});
        }
        ${rejectName} = function(...args) {
          return $1.apply(undefined, args, { arguments: { copy: true }});
        }
      `,
      [resolver.resolve, resolver.reject],
      { arguments: { reference: true } }
    );

    await context.global.set(argsName, args, { copy: true });

    const promptModule = await isolate.compileModule(wrapperCode);

    await promptModule.instantiate(context, () => {
      throw new Error('Imports are not allowed');
    });

    const mainModule = await isolate.compileModule(`
      import ${promptWrapperName} from 'user-prompt-wrapper';
      (async function () {
        try {
          const result = await ${promptWrapperName}(${argsName});
          ${resolveName}(result);
        } catch (err) {
          ${rejectName}(err);
        }
      })();
    `);

    await mainModule.instantiate(context, (specifier) => {
      if (specifier === 'user-prompt-wrapper') {
        return promptModule;
      }
      throw new Error('Unknown import');
    });

    await mainModule.evaluate({
      promise: true,
      timeout: EXECUTION_TIMEOUT_MS,
    });
  } catch (err) {
    resolver.reject(err);
  }

  return PromptWrapperResult.parseAsync(await resolver.promise);
}
