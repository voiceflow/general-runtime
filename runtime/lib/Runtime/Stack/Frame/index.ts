/**
 * Stack Frame documentation
 * @packageDocumentation
 */

import { BaseModels } from '@voiceflow/base-types';

import ProgramModel from '@/runtime/lib/Program';

import Store, { State as StoreState } from '../../Store';

export interface State {
  nodeID?: string | null;
  diagramID: string;
  name?: string;

  storage: StoreState;
  commands?: BaseModels.BaseCommand[];
  variables: StoreState;
}

export interface Options {
  nodeID?: string | null;
  diagramID: string;
  name?: string;

  storage?: StoreState;
  commands?: BaseModels.BaseCommand[];
  variables?: StoreState;

  // deprecated
  blockID?: string | null;
  programID?: string;
}

class Frame {
  private hydrated = false;

  private nodeID?: string | null;

  private startNodeID: string | null = null;

  private diagramID: string;

  private name?: string;

  private commands: BaseModels.BaseCommand[] = [];

  public storage: Store;

  public variables: Store;

  constructor(frameState: Options) {
    // if nodeID is null make sure it gets set to null, big difference between null and undefined
    if ('blockID' in frameState) this.nodeID = frameState.blockID;
    if ('nodeID' in frameState) this.nodeID = frameState.nodeID;

    this.diagramID = frameState.diagramID ?? frameState.programID;
    this.name = frameState.name;

    this.storage = new Store(frameState.storage);
    this.commands = frameState.commands ?? [];
    this.variables = new Store(frameState.variables);
  }

  public getState(): State {
    return {
      nodeID: this.nodeID,
      diagramID: this.diagramID,

      storage: this.storage.getState(),
      commands: this.commands,
      variables: this.variables.getState(),
    };
  }

  public hydrate(program: ProgramModel): void {
    if (this.hydrated) {
      return;
    }

    this.hydrated = true;

    this.name = program.getName();
    this.commands = program.getCommands();
    this.startNodeID = program.getStartNodeID();

    Store.initialize(this.variables, program.getVariables(), 0);

    if (this.nodeID === undefined) {
      this.nodeID = this.startNodeID;
    }
  }

  /**
   * Get the frame's node id.
   *
   * @remarks
   * Some remark for getNodeID().
   *
   * @returns the frame's node id
   *
   * @example
   * Here's a simple usage example
   * ```typescript
   *  const nodeID = frame.getNodeID();
   * ```
   */
  public getNodeID(): string | null | undefined {
    return this.nodeID;
  }

  /**
   * Set the frame's node id.
   *
   * @remarks
   * Some remark for setNodeID().
   *
   * @param nodeID - the node id to set
   * @returns void
   *
   * @example
   * Here's a simple usage example
   * ```typescript
   *  const newNodeID = '123abc';
   *  frame.setNodeID(newNodeID);
   * ```
   */
  public setNodeID(nodeID?: string | null): void {
    this.nodeID = nodeID;
  }

  public getDiagramID(): string {
    return this.diagramID;
  }

  public getName(): string | undefined {
    return this.name;
  }

  public isHydrated(): boolean {
    return this.hydrated;
  }

  public setDiagramID(diagramID: string): void {
    this.diagramID = diagramID;
  }

  public getCommands<T extends BaseModels.BaseCommand = BaseModels.BaseCommand>(): T[] {
    return this.commands as T[];
  }
}

export default Frame;
