/* eslint-disable import/prefer-default-export */
import { isConstructor } from '@/lib/utils';
import { Config } from '@/types';

import { FullServiceMap } from '.';

export abstract class AbstractManager<T = {}> {
  public services: FullServiceMap & T;

  constructor(services: FullServiceMap, public config: Config) {
    this.services = services as FullServiceMap & T;
  }
}

type InjectedServiceMap<S extends object> = { [K in keyof S]: { new (services: FullServiceMap, config: Config): S[K] } };

const constructService = (Service: any, services: any, config: any) => {
  // eslint-disable-next-line no-nested-ternary
  return isConstructor(Service) ? new Service(services, config) : typeof Service === 'function' ? Service(services, config) : Service;
};

export const injectServices = <S extends object>(injectedServiceMap: InjectedServiceMap<S> | S) => <T extends { new (...args: any[]): any }>(
  clazz: T
): any =>
  class extends clazz {
    constructor(...args: any[]) {
      const keys = Object.keys(injectedServiceMap) as (keyof typeof injectedServiceMap)[];
      const [services, config, ...deps] = args;

      const injectedServices = keys
        .filter((key) => !(key in services))
        .reduce((acc, key) => Object.assign(acc, { [key]: constructService(injectedServiceMap[key], services, config) }), {} as S);

      super({ ...services, ...injectedServices }, config, ...deps);
    }
  };
