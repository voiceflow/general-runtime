import { EventType } from '@/runtime/lib/Lifecycle';
import ProgramModel from '@/runtime/lib/Program';
import Runtime from '@/runtime/lib/Runtime';

/**
 * use this class for CPU caching strategies when fetching programs/memory
 * https://en.wikipedia.org/wiki/Cache_replacement_policies
 */
class ProgramManager {
  private cachedProgram: ProgramModel | null = null;

  constructor(private runtime: Runtime) {}

  public async get(versionID: string, diagramID: string): Promise<ProgramModel> {
    let program: ProgramModel | undefined;

    // Event.programWillFetch can optionally override the program
    await this.runtime.callEvent(EventType.programWillFetch, {
      versionID,
      diagramID,
      override: (_program: ProgramModel | undefined) => {
        program = _program;
      },
    });

    // this manager currently just caches the current program, incase it is repeatedly called
    if (
      !program &&
      diagramID === this.cachedProgram?.getDiagramID() &&
      versionID === this.cachedProgram?.getVersionID()
    ) {
      program = this.cachedProgram;
    }

    if (!program) {
      program = new ProgramModel(await this.runtime.api.getProgram(versionID, diagramID));
    }

    this.runtime.callEvent(EventType.programDidFetch, { versionID, diagramID, program });

    this.cachedProgram = program;
    return program;
  }
}

export default ProgramManager;
