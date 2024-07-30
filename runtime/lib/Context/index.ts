/* eslint-disable max-classes-per-file, no-await-in-loop, no-restricted-syntax */

import { Context, ContextHandler, HandleContextEventHandler, InitContextHandler, PartialContext } from './types';

export { Context, ContextHandle, ContextHandler, InitContextHandler, PartialContext } from './types';

export class ContextBuilder<C extends Context<any, any, any>> {
  private pipes: ContextHandler<C>[][] = [];

  addHandlers(...handlers: ContextHandler<C>[]): this {
    this.pipes.push(handlers.filter(Boolean));
    return this;
  }

  async handle(baseContext: C, event: HandleContextEventHandler): Promise<C> {
    let context = baseContext;
    for (const handlers of this.pipes) {
      context.end = false;

      for (const handler of handlers) {
        context = await handler.handle(context, event);

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

  async handle(context: PartialContext<C>, event: HandleContextEventHandler): Promise<C> {
    return super.handle(await this.init.handle(context), event);
  }

  async resolve(context: Promise<C>): Promise<Pick<C, 'request' | 'state' | 'trace'>> {
    const { request, state, trace } = await context;
    return { request, state, trace };
  }
}
