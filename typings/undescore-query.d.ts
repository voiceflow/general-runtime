declare module 'underscore-query' {
  // Need to use this `import` syntax so this is treated as a proper ambient module by TypeScript
  // see: https://stackoverflow.com/questions/39040108/import-class-in-definition-file-d-ts
  declare function lodashModifier(lodash: typeof import('lodash')): void;

  export default lodashModifier;
}
