/**
 * Stack Frame documentation
 * @packageDocumentation
 */

import { Command } from '@voiceflow/api-sdk';

import ProgramModel from '@/runtime/lib/Program';

import Store, { State as StoreState } from '../../Store';

export interface State {
  nodeID?: string | null;
  programID: string;

  storage: StoreState;
  commands?: Command[];
  variables: StoreState;
}

export interface Options {
  nodeID?: string | null;
  programID: string;

  storage?: StoreState;
  commands?: Command[];
  variables?: StoreState;

  // deprecated
  blockID?: string | null;
  diagramID?: string;
}

class Frame {
  private initialized = false;

  private nodeID?: string | null;

  private startNodeID: string | null = null;

  private programID: string;

  private commands: Command[] = [];

  public storage: Store;

  public variables: Store;

  constructor(frameState: Options) {
    // if nodeID is null make sure it gets set to null, big difference between null and undefined
    if ('blockID' in frameState) this.nodeID = frameState.blockID;
    if ('nodeID' in frameState) this.nodeID = frameState.nodeID;

    this.programID = frameState.diagramID ?? frameState.programID;

    this.storage = new Store(frameState.storage);
    this.commands = frameState.commands ?? [];
    this.variables = new Store(frameState.variables);
  }

  public getState(): State {
    return {
      nodeID: this.nodeID,
      programID: this.programID,

      storage: this.storage.getState(),
      commands: this.commands,
      variables: this.variables.getState(),
    };
  }

  public initialize(program: ProgramModel): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

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

  public getProgramID(): string {
    return this.programID;
  }

  public setProgramID(programID: string): void {
    this.programID = programID;
  }

  public getCommands(): Command[] {
    return this.commands;
  }
}

export default Frame;
