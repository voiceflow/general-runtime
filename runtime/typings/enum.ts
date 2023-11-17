export type Enum<T extends Record<string, number | string>> = T[keyof T];
