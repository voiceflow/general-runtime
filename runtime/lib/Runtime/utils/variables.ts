import Store from '@/runtime/lib/Runtime/Store';

export const createCombinedVariables = (global: Store, local: Store): Store => {
  return Store.merge(global, local);
};

export const saveCombinedVariables = (combined: Store, global: Store, local: Store) => {
  const updatedLocal: Record<string, any> = {};
  const updatedGlobal: Record<string, any> = {};

  combined.forEach(({ key, value }) => {
    if (local.has(key)) {
      updatedLocal[key] = value;
    } else if (global.has(key)) {
      updatedGlobal[key] = value;
    } else {
      // leftover/newly introduced variables saved locally to prevent pollution of global space
      updatedLocal[key] = value;
    }
  });

  local.merge(updatedLocal);
  global.merge(updatedGlobal);
};

export const mapStores = (map: [string, string][], from: Store, to: Store): void => {
  to.produce((draft) => {
    map.forEach(([currentVal, newVal]) => {
      draft[newVal] = from.get(currentVal);
    });
  });
};
