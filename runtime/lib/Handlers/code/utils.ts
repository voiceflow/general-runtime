import { Utils } from '@voiceflow/common';
import type { Logger } from '@voiceflow/logger';
import axios from 'axios';
import ivm from 'isolated-vm';
import _ from 'lodash';
import { isDeepStrictEqual } from 'node:util';
import requireFromUrl from 'require-from-url/sync';

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
            return callbacks[callbackName](...args);
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

export const remoteVMExecute = async (endpoint: string, reqData: { code: string; variables: Record<string, any> }) => {
  const response = await axios.post<Record<string, any>>(endpoint, {
    ...reqData,
    keys: getUndefinedKeys(reqData.variables),
  });
  return response.data;
};

export const getUndefinedKeys = (variables: Record<string, unknown>) =>
  Object.keys(variables).filter((key) => variables[key] === undefined);

const isFulfilled = <T>(input: PromiseSettledResult<T>): input is PromiseFulfilledResult<T> =>
  input.status === 'fulfilled';

const isRejected = (input: PromiseSettledResult<unknown>): input is PromiseRejectedResult =>
  input.status === 'rejected';

export const createExecutionResultLogger =
  (log: Logger, context: Record<string, any>) =>
  (
    methodA: { name: string; result: PromiseSettledResult<any> },
    methodB: { name: string; result: PromiseSettledResult<any> }
  ) => {
    // for typescript
    const resultA = methodA.result;
    const resultB = methodB.result;

    if (isRejected(resultA)) {
      if (isFulfilled(resultB)) {
        log.warn(
          { ...context, [methodA.name]: resultA.reason },
          `Code execution ${methodA.name} rejected when ${methodB.name} succeeded`
        );
      } else {
        log.error(
          { ...context, [methodA.name]: resultA.reason, [methodB.name]: resultB.reason },
          `Code execution ${methodA.name} and ${methodB.name} both rejected`
        );
      }
    } else if (isRejected(resultB)) {
      log.warn(
        { ...context, [methodB.name]: resultB.reason },
        `Code execution ${methodA.name} succeeded when ${methodB.name} rejected`
      );
    } else if (Utils.object.isObject(resultA.value) && Utils.object.isObject(resultB.value)) {
      const differentProperties = new Set<string>();
      Utils.array.unique([...Object.keys(resultA.value), ...Object.keys(resultB.value)]).forEach((key) => {
        if (!isDeepStrictEqual(resultA.value[key], resultB.value[key])) {
          differentProperties.add(key);
        }
      });

      log.warn(
        {
          ...context,
          [methodA.name]: _.pick(resultA.value, [...differentProperties]),
          [methodB.name]: _.pick(resultB.value, [...differentProperties]),
        },
        `Code execution results between ${methodA.name} and ${methodB.name} are different`
      );
    } else {
      log.warn(
        { ...context, [methodA.name]: resultA.value, [methodB.name]: resultB.value },
        `Code execution results between ${methodA.name} and ${methodB.name} are different`
      );
    }
  };
