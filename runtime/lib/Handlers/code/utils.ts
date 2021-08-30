import _ from 'lodash';
import requireFromUrl from 'require-from-url/sync';
import { VM } from 'vm2';

import Store from '@/runtime/lib/Runtime/Store';

// eslint-disable-next-line import/prefer-default-export
export const vmExecute = (
  data: { code: string; variables: Record<string, any> },
  safe = true /* set to false when running in testing env */,
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

  vm.run(`${safe ? clearContext : ''} ${data.code}`);

  return Object.keys(data.variables).reduce<Record<string, any>>((acc, key) => {
    const newValue = vm.getGlobal(key);

    acc[key] = Store.formatPayloadValue(newValue);

    return acc;
  }, {});
};
