import ivm from 'isolated-vm';
import _ from 'lodash';
import requireFromUrl from 'require-from-url/sync';
import { VM } from 'vm2';

import Store from '@/runtime/lib/Runtime/Store';

// Reduced limits for IFV2/SETV2 use only
const ISOLATED_VM_LIMITS = {
  maxMemoryMB: 10,
  maxExecutionTimeMs: 1 * 1000,
};

export const ivmExecute = async (data: { code: string; variables: Record<string, any> }, callbacks?: Record<string, (...args: any) => any>) => {
  // Create isolate with 8mb max memory
  const isolate = new ivm.Isolate({ memoryLimit: ISOLATED_VM_LIMITS.maxMemoryMB });
  try {
    // Create a context inside this isolate to run the code in and inject variables/funcs
    const context = await isolate.createContext();

    // Get a Reference{} to the global object within the context.
    const jail = context.global;

    // set Promise to not do anthing in code because it has complex functionality inside the vm
    await jail.set('Promise', null);

    // add callbacks if exists
    if (callbacks) {
      await Promise.all(
        Object.keys(callbacks).map(async (callbackName) => {
          await jail.set(callbackName, (...args: any[]) => {
            callbacks[callbackName](...args);
          });
        })
      );
    }

    // add variables to context
    await Promise.all(
      Object.keys(data.variables).map(async (key) => {
        await jail.set(key, data.variables[key], { copy: true });
      })
    );

    // run code with timeout
    await context.eval(data.code, { timeout: ISOLATED_VM_LIMITS.maxExecutionTimeMs });

    return await Object.keys(data.variables).reduce(async (accPromise, key) => {
      const acc = await accPromise;
      // get new value of variable after code ran
      let val = await jail.get(key);
      if (val instanceof ivm.Reference) {
        // For non-primitives like arrays or objects
        val = await val.copy();
      }
      acc[key] = Store.formatPayloadValue(val);
      return acc;
    }, Promise.resolve({}) as Promise<Record<string, any>>);
  } finally {
    // delete isolate to regain memory
    isolate.dispose();
  }
};

// eslint-disable-next-line import/prefer-default-export
export const vmExecute = (
  data: { code: string; variables: Record<string, any> },
  testingEnv = false /* set to true when running in testing env */,
  callbacks?: Record<string, (...args: any) => any>
) => {
  const vm = new VM({
    timeout: 1000,
    sandbox: {
      Promise: null,
      ..._.cloneDeep(data.variables),
      requireFromUrl,
      ...callbacks,
    },
  });

  const clearContext = `
          (function() {
            Function = undefined;
            const keys = Object.getOwnPropertyNames(this).concat(['constructor']);
            keys.forEach((key) => {
              const item = this[key];
              if (!item || typeof item.constructor !== 'function') return;
              this[key].constructor = undefined;
            });
          })();`;

  vm.run(`${testingEnv ? '' : clearContext} ${data.code}`);

  return Object.keys(data.variables).reduce<Record<string, any>>((acc, key) => {
    const newValue = vm.getGlobal(key);

    acc[key] = Store.formatPayloadValue(newValue);

    return acc;
  }, {});
};

export const getUndefinedKeys = (variables: Record<string, unknown>) => Object.keys(variables).filter((key) => variables[key] === undefined);
