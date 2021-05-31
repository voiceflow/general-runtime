import { expect } from 'chai';
import sinon from 'sinon';

import Store from '@/runtime/lib/Runtime/Store';

describe('Runtime Store unit tests', () => {
  it('getState', () => {
    const payload = { foo: 'bar' };
    const store = new Store(payload);
    expect(store.getState()).to.eql(payload);
  });

  it('get', () => {
    const var1 = 'var';
    const payload = { [var1]: 'var' };
    const store = new Store(payload);
    expect(store.get(var1)).to.eql(payload[var1]);
  });

  it('has', () => {
    const var1 = 'var';
    const payload = { [var1]: 'var' };
    const store = new Store(payload);
    expect(store.has(var1)).to.eql(true);
    expect(store.has('random')).to.eql(false);
  });

  describe('update', () => {
    it('will events', () => {
      const prevState = { foo: 'bar' };
      const nextState = { foo: 'bar2' };
      const didUpdate = sinon.stub();
      const willUpdate = sinon.stub();

      const store = new Store(prevState, { didUpdate, willUpdate });
      store.update(nextState);

      expect(store.getState()).to.eql(nextState);
      expect(willUpdate.args).to.eql([[prevState, nextState]]);
      expect(didUpdate.args).to.eql([[prevState, nextState]]);
    });

    it('without events', () => {
      const prevState = { foo: 'bar' };
      const nextState = { foo: 'bar2' };

      const store = new Store(prevState);
      store.update(nextState);

      expect(store.getState()).to.eql(nextState);
    });
  });

  it('produce', () => {
    const state = { foo: 'bar' };
    const newVal = 'bar2';
    const producer = (draft: typeof state) => {
      draft.foo = newVal;
    };

    const store = new Store(state);
    store.produce(producer as any);
    expect(store.getState()).to.eql({ foo: newVal });
  });

  it('merge', () => {
    const state = { var1: 'val1' };
    const payload = { var2: 'val2' };

    const store = new Store(state);
    store.merge(payload);
    expect(store.getState()).to.eql({ var1: 'val1', var2: 'val2' });
  });

  it('set', () => {
    const store = new Store();
    store.set('var', 'val');
    expect(store.getState()).to.eql({ var: 'val' });
  });

  it('delete', () => {
    const state = { var: 'val' };
    const store = new Store(state);
    store.delete('var');
    expect(store.getState()).to.eql({});
  });

  it('keys', () => {
    const state = { var1: 'val1', var2: 'val2' };
    const store = new Store(state);
    expect(store.keys()).to.eql(['var1', 'var2']);
  });

  it('reduce', () => {
    const state = { var1: 'val1', var2: 'val2' };
    const store = new Store(state);

    const result = store.reduce<any>((acc, value) => {
      acc.push(value);
      return acc;
    }, []);

    expect(result).to.eql([
      { key: 'var1', value: 'val1' },
      { key: 'var2', value: 'val2' },
    ]);
  });

  it('map', () => {
    const state = { var1: 'val1', var2: 'val2' };
    const store = new Store(state);

    const result = store.map<any>((value) => {
      return value.value;
    });
    expect(result).to.eql(['val1', 'val2']);
  });

  it('forEach', () => {
    const state = { var1: 'val1', var2: 'val2' };
    const store = new Store(state);

    const result: any = [];
    store.forEach((value) => {
      result.push(value.value);
    });

    expect(result).to.eql(['val1', 'val2']);
  });

  it('flush', () => {
    const state = { var1: 'val1', var2: 'val2' };
    const store = new Store(state);

    store.flush();
    expect(store.getState()).to.eql({});
  });

  it('static merge', () => {
    const store1 = new Store({ var1: 'val1' });
    const store2 = new Store({ var2: 'val2' });

    const store = Store.merge(store1, store2);
    expect(store.getState()).to.eql({ var1: 'val1', var2: 'val2' });
  });

  it('static initiliaze', () => {
    const store = new Store({ var3: 1 });
    const keys = ['var1', 'var2', 'var3'];

    Store.initialize(store, keys);
    expect(store.getState()).to.eql({ var1: 0, var2: 0, var3: 1 });
  });
});
