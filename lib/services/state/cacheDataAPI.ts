import { Program, Project, Version } from '@voiceflow/general-types';

import { DataAPI } from '@/runtime';

// cache any versions or project it comes across
class CacheDataAPI implements DataAPI<Program.GeneralProgram, Version.GeneralVersion, Project.GeneralProject> {
  private projects: Record<string, Project.GeneralProject> = {};

  private versions: Record<string, Version.GeneralVersion> = {};

  constructor(private api: DataAPI<Program.GeneralProgram, Version.GeneralVersion>) {}

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
      this.projects[projectID] = (await this.api.getProject(projectID)) as Project.GeneralProject;
    }

    return this.projects[projectID];
  }

  async init() {
    await this.api.init();
  }

  async unhashVersionID(versionID: string) {
    return this.api.unhashVersionID(versionID);
  }

  async fetchDisplayById(displayId: number) {
    return this.api.fetchDisplayById(displayId);
  }
}

export default CacheDataAPI;
