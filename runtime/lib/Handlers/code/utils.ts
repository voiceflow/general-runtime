import Logger from '@voiceflow/logger';
import axios from 'axios';
import ivm from 'isolated-vm';
import _ from 'lodash';
import { isDeepStrictEqual } from 'node:util';
import requireFromUrl from 'require-from-url/sync';
import { VM } from 'vm2';

import Store from '@/runtime/lib/Runtime/Store';

// Reduced limits for IFV2/SETV2 use only
const ISOLATED_VM_LIMITS = {
  maxMemoryMB: 10,
  maxExecutionTimeMs: 1 * 1000,
};

export interface IvmExecuteOptions {
  legacyRequireFromUrl?: boolean;
}

export const ivmExecute = async (
  data: { code: string; variables: Record<string, any> },
  callbacks?: Record<string, (...args: any) => any>,
  options: IvmExecuteOptions = {}
) => {
  // Create isolate with 8mb max memory
  const isolate = new ivm.Isolate({ memoryLimit: ISOLATED_VM_LIMITS.maxMemoryMB });
  try {
    // Create a context inside this isolate to run the code in and inject variables/funcs
    const context = await isolate.createContext();

    // Get a Reference{} to the global object within the context.
    const jail = context.global;

    await Promise.all([
      // have the `global` variable available inside the vm
      jail.set('global', jail.derefInto()),
      // set Promise to not do anything in code because it has complex functionality inside the vm
      jail.set('Promise', null),
    ]);

    if (options.legacyRequireFromUrl) {
      // support legacy `requireFromUrl` functionality
      await jail.set('requireFromUrl', (url: string) => requireFromUrl(url));
    }

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

export const vmExecute = (
  data: { code: string; variables: Record<string, any> },
  testingEnv?: boolean | undefined /* set to true when running in testing env */,
  callbacks?: Record<string, (...args: any) => any>
) => {
  const testingEnvValue = testingEnv ?? false;
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

  vm.run(`${testingEnvValue ? '' : clearContext} ${data.code}`);

  return Object.keys(data.variables).reduce<Record<string, any>>((acc, key) => {
    const newValue = vm.getGlobal(key);

    acc[key] = Store.formatPayloadValue(newValue);

    return acc;
  }, {});
};

export const remoteVMExecute = async (endpoint: string, reqData: { code: string; variables: Record<string, any> }) => {
  const response = await axios.post<Record<string, any>>(endpoint, {
    ...reqData,
    keys: getUndefinedKeys(reqData.variables),
  });
  return response.data;
};

export const getUndefinedKeys = (variables: Record<string, unknown>) =>
  Object.keys(variables).filter((key) => variables[key] === undefined);

export const objectDiff = (object: Record<string, any>, base: Record<string, any>) => {
  const changes = (object: Record<string, any>, base: Record<string, any>) => {
    return _.transform(
      object,
      (result, value, key) => {
        if (!_.isEqual(value, base[key])) {
          result[key] = _.isObject(value) && _.isObject(base[key]) ? changes(value, base[key]) : value;
        }
      },
      {} as Record<string, any>
    );
  };

  return changes(object, base);
};

export const createExecutionResultLogger =
  (log: Logger, context: Record<string, any>) =>
  (
    resultA: { name: string; result: PromiseSettledResult<any> },
    resultB: { name: string; result: PromiseSettledResult<any> }
  ) => {
    if (resultA.result.status === 'rejected') {
      if (resultB.result.status === 'fulfilled') {
        log.warn(`Legacy vm2 code execution rejected when isolated-vm succeeded ${log.vars(context)}`);
      }
    } else if (resultB.result.status === 'rejected') {
      log.warn(`Legacy vm2 code execution succeeded when isolated-vm rejected ${log.vars(context)}`);
    } else if (!isDeepStrictEqual(resultA.result.value, resultB.result.value)) {
      const diff = objectDiff(resultA.result.value, resultB.result.value);
      log.warn(
        `Legacy vm2 and isolated-vm code execution results are different ${log.vars({
          ...context,
          ...{ [resultA.name]: resultA.result.value, [resultB.name]: resultB.result.value },
          diff,
        })}`
      );
    }
  };
