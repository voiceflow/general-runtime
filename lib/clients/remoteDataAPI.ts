import { Program, Version } from '@voiceflow/api-sdk';
import { Command, GeneralNodes, GeneralVersionData } from '@voiceflow/general-types';

import { ServerDataApi } from '@/runtime';

class RemoteDataAPI extends ServerDataApi<Program<GeneralNodes, Command>, Version<GeneralVersionData>> {
  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<Program<GeneralNodes, Command>>(`/prototype-programs/${programID}`);
    return data;
  };
}

export default RemoteDataAPI;
