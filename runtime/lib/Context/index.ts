/* eslint-disable max-classes-per-file, no-await-in-loop, no-restricted-syntax */

import { Context, ContextHandler, InitContextHandler, PartialContext } from './types';

export { Context, ContextHandle, ContextHandler, InitContextHandler, PartialContext } from './types';

export class ContextBuilder<C extends Context<any, any, any>> {
  private pipes: ContextHandler<C>[][] = [];

  addHandlers(...handlers: ContextHandler<C>[]): this {
    this.pipes.push(handlers);
    return this;
  }

  async handle(baseContext: C): Promise<C> {
    let context = baseContext;
    for (const handlers of this.pipes) {
      context.end = false;

      for (const handler of handlers) {
        context = await handler.handle(context);

        if (context.end) break;
      }
    }

    return context;
  }
}

export class TurnBuilder<C extends Context<any, any, any>> extends ContextBuilder<C> {
  constructor(private init: InitContextHandler<C>) {
    super();
  }

  async handle(context: PartialContext<C>): Promise<C> {
    return super.handle(await this.init.handle(context));
  }

  async resolve(context: Promise<C>): Promise<Pick<C, 'request' | 'state' | 'trace'>> {
    const { request, state, trace } = await context;
    return { request, state, trace };
  }
}
