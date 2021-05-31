import Runtime from '../Runtime';
import { CallbackEvent, Event, EventCallback, EventCallbackMap, EventType } from './types';

export { EventType, Event, EventCallbackMap, EventCallback, CallbackEvent };

class Lifecycle {
  private events: Partial<EventCallbackMap> = {};

  public setEvent<K extends EventType>(type: K, callback: EventCallback<K>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    this.events[type] = callback;
  }

  public getEvent<K extends EventType>(type: K): EventCallback<K> | undefined {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return (this.events as EventCallbackMap)[type];
  }

  public async callEvent<K extends EventType>(type: K, event: Event<K>, runtime: Runtime): Promise<void> {
    await this.getEvent<K>(type)?.({ ...event, runtime });
  }
}

export abstract class AbstractLifecycle {
  constructor(protected events: Lifecycle = new Lifecycle()) {}

  public setEvent<K extends EventType>(type: K, callback: EventCallback<K>) {
    this.events.setEvent<K>(type, callback);
  }

  public async callEvent<K extends EventType>(type: K, event: Event<K>, runtime: Runtime) {
    await this.events.callEvent<K>(type, event, runtime);
  }
}

export default Lifecycle;
