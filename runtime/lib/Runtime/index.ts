import Handler from '@/runtime/lib/Handler';
import Lifecycle, { AbstractLifecycle, Event, EventType } from '@/runtime/lib/Lifecycle';
import cycleStack from '@/runtime/lib/Runtime/cycleStack';

import { DataAPI } from '../DataAPI';
import OutgoingApiLimiter from './OutgoingApiLimiter';
import Stack, { Frame, FrameState } from './Stack';
import Store, { State as StorageState } from './Store';
import Trace from './Trace';
import ProgramManager from './utils/programManager';

export interface Options<DA extends DataAPI = DataAPI> {
  api: DA;
  handlers?: Handler<any>[];
  services?: Record<string, any>;
}

export interface State {
  turn?: StorageState;
  stack: FrameState[];
  storage: StorageState;
  variables: StorageState;
}

export enum Action {
  IDLE,
  REQUEST, // incoming user request that needs to be handled
  RUNNING, // normal execution
  END,
}

class Runtime<R extends any = any, DA extends DataAPI = DataAPI> extends AbstractLifecycle {
  public turn: Store;

  public stack: Stack;

  // storage variables
  public storage: Store;

  // global variables
  public variables: Store;

  public trace: Trace;

  // services
  public services: Record<string, any>;

  public api: DA;

  public outgoingApiLimiter: OutgoingApiLimiter;

  private action: Action = Action.IDLE;

  private handlers: Handler[];

  private programManager: ProgramManager;

  constructor(
    public versionID: string,
    state: State,
    private request: R | null = null,
    { services = {}, handlers = [], api }: Options<DA>,
    events: Lifecycle
  ) {
    super(events);

    const createEvent = <K extends EventType>(type: K) => (event: Event<K>) => this.callEvent(type, event);

    this.services = services;
    this.handlers = handlers;
    this.api = api;

    this.stack = new Stack(state.stack, {
      willChange: createEvent(EventType.stackWillChange),
      didChange: createEvent(EventType.stackDidChange),
    });

    this.turn = new Store(state.turn, {
      didUpdate: createEvent(EventType.turnDidUpdate),
      willUpdate: createEvent(EventType.turnWillUpdate),
    });

    this.storage = new Store(state.storage, {
      didUpdate: createEvent(EventType.storageDidUpdate),
      willUpdate: createEvent(EventType.storageWillUpdate),
    });

    this.variables = new Store(state.variables, {
      didUpdate: createEvent(EventType.variablesDidUpdate),
      willUpdate: createEvent(EventType.variablesWillUpdate),
    });

    this.trace = new Trace(this);

    this.programManager = new ProgramManager(this);

    this.outgoingApiLimiter = new OutgoingApiLimiter(this);
  }

  getRequest(): R | null {
    return this.request;
  }

  public setAction(type: Action): void {
    this.action = type;
  }

  public getAction(): Action {
    return this.action;
  }

  public end(): void {
    this.setAction(Action.END);
  }

  public hasEnded(): boolean {
    return this.getAction() === Action.END;
  }

  public async callEvent<K extends EventType>(type: K, event: Event<K>) {
    await super.callEvent<K>(type, event, this);
  }

  public getProgram(programID: string) {
    return this.programManager.get(programID);
  }

  private async injectBaseProgram() {
    if (this.stack.get(0)?.getProgramID() === this.versionID) {
      return;
    }

    // insert base program to the stack
    const program = await this.api.getProgram(this.versionID).catch(() => null);
    this.stack.unshift(
      new Frame({
        programID: this.versionID,
        commands: [...(program?.commands ?? [])],
        nodeID: null,
      })
    );
  }

  public async update(): Promise<void> {
    try {
      await this.injectBaseProgram();
      await this.callEvent(EventType.updateWillExecute, {});

      if (this.action !== Action.IDLE) {
        throw new Error('runtime updated twice');
      }

      // request coming in
      this.setAction(Action.REQUEST);

      await cycleStack(this);

      await this.callEvent(EventType.updateDidExecute, {});
    } catch (error) {
      await this.callEvent(EventType.updateDidCatch, { error });
    }
  }

  public getFinalState(): State {
    if (this.action === Action.IDLE) {
      throw new Error('runtime not updated');
    }

    return {
      stack: this.stack.getState(),
      storage: this.storage.getState(),
      variables: this.variables.getState(),
    };
  }

  public getRawState(): State {
    return {
      turn: this.turn.getState(),
      stack: this.stack.getState(),
      storage: this.storage.getState(),
      variables: this.variables.getState(),
    };
  }

  public getHandlers<T extends Handler = Handler>(): T[] {
    return this.handlers as T[];
  }

  public getVersionID() {
    return this.versionID;
  }
}

export default Runtime;
