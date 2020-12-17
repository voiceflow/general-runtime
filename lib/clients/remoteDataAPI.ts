import { Program, Version } from '@voiceflow/api-sdk';
import { GeneralCommands, GeneralNodes, GeneralVersionData } from '@voiceflow/general-types';
import { ServerDataApi } from '@voiceflow/runtime';

class RemoteDataAPI extends ServerDataApi<Program<GeneralNodes, GeneralCommands>, Version<GeneralVersionData>> {
  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<Program<GeneralNodes, GeneralCommands>>(`/prototype-programs/${programID}`);
    return data;
  };
}

export default RemoteDataAPI;
