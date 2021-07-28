import { BaseCommand, BaseNode, Program } from '@voiceflow/api-sdk';

type MinimalProgram = Partial<Program> & Pick<Program, 'id' | 'lines' | 'startId'>;

export class ProgramModel {
  private id: string;

  private name?: string;

  private nodes: Record<string, BaseNode>;

  private commands: BaseCommand[] = [];

  private variables: string[] = [];

  private startNodeID: string;

  constructor({ id, lines, variables = [], commands = [], name, startId }: MinimalProgram) {
    this.id = id;
    this.name = name;
    this.nodes = lines;
    this.commands = commands;
    this.variables = variables;
    this.startNodeID = startId;
  }

  public getID(): string {
    return this.id;
  }

  public getNode(nodeID?: string | null): BaseNode | null {
    // eslint-disable-next-line no-prototype-builtins
    if (!(nodeID && this.nodes.hasOwnProperty(nodeID))) {
      return null;
    }

    return {
      ...this.nodes[nodeID],
      id: nodeID,
    };
  }

  public getCommands<T extends BaseCommand = BaseCommand>(): T[] {
    return this.commands as T[];
  }

  public getStartNodeID(): string {
    return this.startNodeID;
  }

  public getVariables(): string[] {
    return this.variables;
  }

  public getName() {
    return this.name;
  }

  public getRaw() {
    return this.nodes;
  }
}

export default ProgramModel;
