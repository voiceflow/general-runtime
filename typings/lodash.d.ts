declare module 'lodash' {
  /**
   * The `query` function filters the `collection` based on the given `criteria`.
   *
   * This `_.query()` function is injected into the lodash object dynamically by the
   * `underscore-query` library.
   *
   * See: https://www.npmjs.com/package/underscore-query
   *
   * !TODO! - Provide more specific typing on the `criteria` for better type-safety.
   */
  declare function query<T>(collection: T[], criteria: Record<string, any>): T[];
}
