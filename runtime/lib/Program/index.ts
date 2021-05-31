import { Command, Node, Program } from '@voiceflow/api-sdk';

type MinimalProgram = Partial<Program> & Pick<Program, 'id' | 'lines' | 'startId'>;

export class ProgramModel {
  private id: string;

  private nodes: Record<string, Node>;

  private commands: Command[] = [];

  private variables: string[] = [];

  private startNodeID: string;

  constructor({ id, lines, variables = [], commands = [], startId }: MinimalProgram) {
    this.id = id;
    this.nodes = lines;
    this.commands = commands;
    this.variables = variables;
    this.startNodeID = startId;
  }

  public getID(): string {
    return this.id;
  }

  public getNode(nodeID?: string | null): Node | null {
    // eslint-disable-next-line no-prototype-builtins
    if (!(nodeID && this.nodes.hasOwnProperty(nodeID))) {
      return null;
    }

    return {
      ...this.nodes[nodeID],
      id: nodeID,
    };
  }

  public getCommands(): Command[] {
    return this.commands;
  }

  public getStartNodeID(): string {
    return this.startNodeID;
  }

  public getVariables(): string[] {
    return this.variables;
  }

  public getRaw() {
    return this.nodes;
  }
}

export default ProgramModel;
