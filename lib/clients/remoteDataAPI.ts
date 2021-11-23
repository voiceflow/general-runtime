import { Program, Version } from '@voiceflow/general-types';

import { ServerDataApi } from '@/runtime';

class RemoteDataAPI extends ServerDataApi<Program.GeneralProgram, Version.GeneralVersion> {
  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<Program.GeneralProgram>(`/prototype-programs/${programID}`);
    return data;
  };
}

export default RemoteDataAPI;
