import { BaseModels } from '@voiceflow/base-types';

type MinimalProgram = Partial<BaseModels.Program.Model> & Pick<BaseModels.Program.Model, 'id' | 'lines' | 'startId'>;

export class ProgramModel {
  private id: string;

  private name?: string;

  private nodes: Record<string, BaseModels.BaseNode>;

  private commands: BaseModels.BaseCommand[] = [];

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

  public getNode(nodeID?: string | null): BaseModels.BaseNode | null {
    // eslint-disable-next-line no-prototype-builtins
    if (!(nodeID && this.nodes.hasOwnProperty(nodeID))) {
      return null;
    }

    return {
      ...this.nodes[nodeID],
      id: nodeID,
    };
  }

  public getCommands<T extends BaseModels.BaseCommand = BaseModels.BaseCommand>(): T[] {
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
