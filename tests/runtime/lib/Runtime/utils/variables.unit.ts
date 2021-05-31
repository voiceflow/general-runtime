import { expect } from 'chai';

import Store from '@/runtime/lib/Runtime/Store';
import { createCombinedVariables, mapStores, saveCombinedVariables } from '@/runtime/lib/Runtime/utils/variables';

describe('Runtime utils variables', () => {
  it('createCombinedVariables', () => {
    const globalVar = 'global-val';
    const global = new Store({ globalVar });
    const localVar = 'local-val';
    const local = new Store({ localVar });

    const combinedStore = createCombinedVariables(global, local);
    expect(combinedStore.get('globalVar')).to.eql(globalVar);
    expect(combinedStore.get('localVar')).to.eql(localVar);
  });

  it('mapStores', () => {
    const map = [
      ['a1', 'a2'],
      ['b1', 'b2'],
    ];
    const a = 'valA';
    const b = 'valB';
    const store1 = new Store({ a1: a, b1: b });
    const store2 = new Store();

    mapStores(map as any, store1, store2);
    expect(store2.get('a2')).to.eql(a);
    expect(store2.get('b2')).to.eql(b);
  });

  it('saveCombinedVariables', () => {
    const localVar = 'local-val';
    const globalVar = 'global-val';
    const newVar = 'new-val';

    const combined = new Store({ localVar, globalVar, newVar });
    const global = new Store({ globalVar });
    const local = new Store({ localVar });

    saveCombinedVariables(combined, global, local);
    expect(local.get('localVar')).to.eql(localVar);
    expect(local.get('newVar')).to.eql(newVar);
    expect(global.get('globalVar')).to.eql(globalVar);
  });
});
