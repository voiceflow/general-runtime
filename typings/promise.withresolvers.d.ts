declare module 'promise.withresolvers' {
  export interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: any) => void;
  }

  export default function withResolvers<T>(Promise: PromiseConstructor): PromiseWithResolvers<T>;
}
