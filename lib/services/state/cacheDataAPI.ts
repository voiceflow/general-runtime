import { VoiceflowProgram, VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { DataAPI } from '@/runtime';

// cache any versions or project it comes across
class CacheDataAPI implements DataAPI<VoiceflowProgram.Program, VoiceflowVersion.Version, VoiceflowProject.Project> {
  private projects: Record<string, VoiceflowProject.Project> = {};

  private versions: Record<string, VoiceflowVersion.Version> = {};

  private projectNLPCache: Map<string, Awaited<ReturnType<typeof this.api.getProjectNLP>>> = new Map();

  constructor(private api: DataAPI<VoiceflowProgram.Program, VoiceflowVersion.Version>) {}

  async getProgram(programID: string) {
    return this.api.getProgram(programID);
  }

  async getVersion(versionID: string) {
    if (!(versionID in this.versions)) {
      this.versions[versionID] = await this.api.getVersion(versionID);
    }
    return this.versions[versionID];
  }

  async getProject(projectID: string) {
    if (!(projectID in this.projects)) {
      this.projects[projectID] = (await this.api.getProject(projectID)) as VoiceflowProject.Project;
    }

    return this.projects[projectID];
  }

  async init() {
    await this.api.init();
  }

  async unhashVersionID(versionID: string): Promise<string> {
    return this.api.unhashVersionID(versionID);
  }

  async fetchDisplayById(displayId: number) {
    return this.api.fetchDisplayById(displayId);
  }

  async getProjectNLP(projectID: string) {
    if (!this.projectNLPCache.has(projectID)) {
      this.projectNLPCache.set(projectID, await this.api.getProjectNLP(projectID));
    }

    return this.projectNLPCache.get(projectID)!;
  }

  async getProjectUsingAPIKey(apiKeyID: string): Promise<VoiceflowProject.Project> {
    const project = await this.api.getProjectUsingAPIKey(apiKeyID);
    return project as VoiceflowProject.Project;
  }
}

export default CacheDataAPI;