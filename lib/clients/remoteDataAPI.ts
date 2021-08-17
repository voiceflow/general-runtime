import { Version } from '@voiceflow/general-types';
import { GeneralProgram } from '@voiceflow/general-types/build/program';

import { ServerDataApi } from '@/runtime';

class RemoteDataAPI extends ServerDataApi<GeneralProgram, Version.GeneralVersion> {
  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<GeneralProgram>(`/prototype-programs/${programID}`);
    return data;
  };
}

export default RemoteDataAPI;
