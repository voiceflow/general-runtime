/* eslint-disable no-unused-expressions */

import produce, { Draft } from 'immer';

export type State = { readonly [k: string]: any };

type DidUpdate = (prevState: State, state: State) => void;
type WillUpdate = (state: State, nextState: State) => void;

class Store {
  private store: State = {};

  private readonly didUpdate?: DidUpdate;

  private readonly willUpdate?: WillUpdate;

  static initialize = (store: Store, keys: string[], initialValue: unknown = 0): void => {
    const keysToMerge = keys.reduce((acc, key) => {
      if (store.get(key) === undefined) {
        acc[key] = initialValue;
      }

      return acc;
    }, {} as Record<string, any>);

    store.merge(keysToMerge);
  };

  static merge(store1: Store, store2: Store): Store {
    return new Store({ ...store1.getState(), ...store2.getState() });
  }

  constructor(payload: State = {}, { didUpdate, willUpdate }: { didUpdate?: DidUpdate; willUpdate?: WillUpdate } = {}) {
    this.store = { ...payload };

    this.didUpdate = didUpdate;
    this.willUpdate = willUpdate;
  }

  public getState<S extends State>(): S {
    return this.store as S;
  }

  public get<T extends unknown>(key: string): undefined | T {
    return this.store[key];
  }

  public has(key: string): boolean {
    // eslint-disable-next-line no-prototype-builtins
    return this.store.hasOwnProperty(key);
  }

  public update<S extends State>(nextState: S): void {
    const prevState = this.store;

    this.willUpdate?.(this.store, nextState);

    this.store = nextState;

    this.didUpdate?.(prevState, this.store);
  }

  public produce<S extends State>(producer: (draft: Draft<S>) => void): void {
    this.update(produce(this.store, producer));
  }

  public merge<S extends State>(payload: Partial<S>): void {
    this.produce((draft: Draft<S>) => Object.assign(draft, payload));
  }

  public set<T extends unknown>(key: string, value: T): void {
    this.produce((draft: Draft<State>) => {
      draft[key] = value;
    });
  }

  public delete(key: string): void {
    this.produce((draft: Draft<State>) => {
      delete draft[key];
    });
  }

  public keys(): string[] {
    return Object.keys(this.store);
  }

  public reduce<T>(callback: (acc: T, value: { key: string; value: unknown }, index: number) => T, initial: T): T {
    return this.keys().reduce((acc, key, i) => callback(acc, { key, value: this.get(key) }, i), initial);
  }

  public map<T>(callback: (value: { key: string; value: unknown }, index: number) => T): T[] {
    return this.reduce<T[]>((acc, ...args) => [...acc, callback(...args)], []);
  }

  public forEach(callback: (value: { key: string; value: unknown }, index: number) => void) {
    this.reduce<void[]>((_, ...args) => [callback(...args)], []);
  }

  public flush(): void {
    this.update({});
  }
}

export default Store;
