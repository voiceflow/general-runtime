import { Program, Project, Version } from '@voiceflow/api-sdk';
import { Command, GeneralNodes, GeneralVersionData } from '@voiceflow/general-types';

import { DataAPI } from '@/runtime';

// cache any versions or project it comes across
class CacheDataAPI implements DataAPI<Program<GeneralNodes, Command>, Version<GeneralVersionData>> {
  private projects: Record<string, Project<any, any>> = {};

  private versions: Record<string, Version<GeneralVersionData>> = {};

  constructor(private api: DataAPI<Program<GeneralNodes, Command>, Version<GeneralVersionData>>) {}

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
      this.projects[projectID] = await this.api.getProject(projectID);
    }

    return this.projects[projectID];
  }

  async init() {
    await this.api.init();
  }

  async fetchDisplayById(displayId: number) {
    return this.api.fetchDisplayById(displayId);
  }
}

export default CacheDataAPI;
