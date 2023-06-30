import * as BaseTypes from '@voiceflow/base-types';

import { FrameType } from '@/lib/services/runtime/types';
import Handler from '@/runtime/lib/Handler';
import Lifecycle, { AbstractLifecycle, Event, EventType } from '@/runtime/lib/Lifecycle';
import cycleStack from '@/runtime/lib/Runtime/cycleStack';

import { DataAPI as AnyDataAPI } from '../DataAPI';
import DebugLogging from './DebugLogging';
import OutgoingApiLimiter from './OutgoingApiLimiter';
import Stack, { Frame, FrameState } from './Stack';
import Store, { State as StorageState } from './Store';
import Trace from './Trace';
import ProgramManager from './utils/programManager';

export interface Options<
  DataAPI extends AnyDataAPI = AnyDataAPI,
  Services extends BaseTypes.AnyRecord = BaseTypes.AnyRecord
> {
  api: DataAPI;
  handlers?: Handler<any>[];
  services?: Services;
}

export interface State {
  turn?: StorageState;
  stack: FrameState[];
  storage: StorageState;
  variables: StorageState;
}

export interface RuntimeOptions<
  Request = any,
  DataAPI extends AnyDataAPI = AnyDataAPI,
  Services extends BaseTypes.AnyRecord = BaseTypes.AnyRecord,
  Version extends BaseTypes.BaseVersion.Version = BaseTypes.BaseVersion.Version,
  Project extends BaseTypes.BaseProject.Project = BaseTypes.BaseProject.Project
> {
  versionID: string;
  state: State;
  request?: Request | undefined;
  options: Options<DataAPI, Services>;
  events: Lifecycle;
  version?: Version;
  project?: Project;
  plan?: string;
}

export enum Action {
  IDLE,
  REQUEST, // incoming user request that needs to be handled
  RUNNING, // normal execution
  END,
}

class Runtime<
  Request = any,
  DataAPI extends AnyDataAPI = AnyDataAPI,
  Services extends BaseTypes.AnyRecord = BaseTypes.AnyRecord,
  Version extends BaseTypes.BaseVersion.Version = BaseTypes.BaseVersion.Version,
  Project extends BaseTypes.BaseProject.Project = BaseTypes.BaseProject.Project
> extends AbstractLifecycle {
  public turn: Store;

  public stack: Stack;

  // storage variables
  public storage: Store;

  // global variables
  public variables: Store;

  public trace: Trace;

  // services
  public services: Services;

  public api: DataAPI;

  public outgoingApiLimiter: OutgoingApiLimiter;

  private action: Action = Action.IDLE;

  private handlers: Handler[];

  private programManager: ProgramManager;

  public debugLogging: DebugLogging;

  public versionID: string;

  private request: Request | null;

  public version?: Version;

  public project?: Project;

  public plan?: string;

  constructor({
    events,
    versionID,
    version,
    project,
    request,
    state,
    options,
    plan
  }: RuntimeOptions<Request, DataAPI, Services, Version, Project>) {
    super(events);

    this.versionID = versionID;
    this.request = request ?? null;
    this.version = version;
    this.project = project;
    this.plan = plan;

    const { services = {} as Services, handlers = [], api } = options;

    const createEvent =
      <K extends EventType>(type: K) =>
      (event: Event<K>) =>
        this.callEvent(type, event);

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

    this.debugLogging = new DebugLogging(this.trace);
  }

  getRequest(): Request | null {
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
    if (!program) {
      return;
    }

    this.stack.unshift(
      new Frame({
        programID: this.versionID,
        commands: [...(program?.commands ?? [])],
        nodeID: null,
        storage: { [FrameType.IS_BASE]: true },
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

      if (this.getRequest() !== null) {
        // request coming in
        this.setAction(Action.REQUEST);
      } else {
        this.setAction(Action.RUNNING);
      }

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

  public async hydrateStack(): Promise<void> {
    await this.injectBaseProgram();
    await Promise.all(
      this.stack.getFrames().map(async (frame) => {
        if (frame.isHydrated()) return;

        const program = await this.getProgram(frame.getProgramID());
        frame.hydrate(program);
      })
    );
  }

  public getHandlers<T extends Handler = Handler>(): T[] {
    return this.handlers as T[];
  }

  public getVersionID() {
    return this.versionID;
  }
}

export default Runtime;
