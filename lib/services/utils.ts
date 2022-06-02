/* eslint-disable max-classes-per-file */
import { AbstractManager as BaseAbstractManager } from '@voiceflow/backend-utils';

import { isConstructor } from '@/lib/utils';
import { Config } from '@/types';

import { FullServiceMap } from '.';

export abstract class AbstractManager<T = Record<string, any>> extends BaseAbstractManager<FullServiceMap, Config, T> {}

type InjectedServiceMap<S extends Record<string, unknown>> = {
  [K in keyof S]: { new (services: FullServiceMap, config: Config): S[K] };
};

const constructService = (Service: any, services: any, config: any) => {
  // eslint-disable-next-line no-nested-ternary
  return isConstructor(Service)
    ? new Service(services, config)
    : typeof Service === 'function'
    ? Service(services, config)
    : Service;
};

export const injectServices =
  <S extends Record<string, unknown>>(injectedServiceMap: InjectedServiceMap<S> | S) =>
  <T extends { new (...args: any[]): any }>(clazz: T): any =>
    class extends clazz {
      constructor(...args: any[]) {
        const keys = Object.keys(injectedServiceMap) as (keyof typeof injectedServiceMap)[];
        const [services, config, ...deps] = args;

        const injectedServices = keys
          .filter((key) => !(key in services))
          .reduce(
            (acc, key) => Object.assign(acc, { [key]: constructService(injectedServiceMap[key], services, config) }),
            {} as S
          );

        super({ ...services, ...injectedServices }, config, ...deps);
      }
    };
