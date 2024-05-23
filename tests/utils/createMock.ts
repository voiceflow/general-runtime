import cloneDeep from 'lodash/cloneDeep.js';
import isPlainObject from 'lodash/isPlainObject.js';
import { PartialDeep } from 'type-fest';

const isObject = (value: unknown): value is Record<string, any> => {
  return isPlainObject(value);
};

const deepOverwrite = (value: any, overwrite: PartialDeep<typeof value>): typeof value => {
  if (!isObject(overwrite) || !isObject(value)) return overwrite;

  return Object.keys(overwrite).reduce((acc, key) => {
    return {
      ...acc,
      [key]: deepOverwrite(acc[key], overwrite[key]),
    };
  }, value);
};

export const mockCreatorFactory =
  <T extends Record<string, any>>(defaultValue: T) =>
  (overwrite?: PartialDeep<T>): T => {
    if (!isObject(defaultValue)) return overwrite as T;
    const clonedValue = cloneDeep(defaultValue);
    return deepOverwrite(clonedValue, overwrite ?? {});
  };
