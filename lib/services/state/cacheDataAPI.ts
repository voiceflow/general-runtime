import { VoiceflowProgram, VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { DataAPI } from '@/runtime';

// cache any versions or project it comes across
class CacheDataAPI implements DataAPI<VoiceflowProgram.Program, VoiceflowVersion.Version, VoiceflowProject.Project> {
  private projects: Record<string, VoiceflowProject.Project> = {};

  private versions: Record<string, VoiceflowVersion.Version> = {};

  constructor(private api: DataAPI<VoiceflowProgram.Program, VoiceflowVersion.Version>) {}

  async getProgram(versionID: string, diagramID: string) {
    return this.api.getProgram(versionID, diagramID);
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

  async getProjectVersionIDByTag(projectID: string, tag: string): Promise<string | undefined> {
    return this.api.getProjectVersionIDByTag(projectID, tag);
  }

  async getKBDocuments(projectID: string, documentIDs: string[]) {
    return this.api.getKBDocuments(projectID, documentIDs);
  }

  async hasKBDocuments(projectID: string) {
    return this.api.hasKBDocuments(projectID);
  }
}

export default CacheDataAPI;
