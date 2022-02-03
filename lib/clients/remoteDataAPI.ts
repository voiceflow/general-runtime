import { VoiceflowProgram, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { ServerDataApi } from '@/runtime';

class RemoteDataAPI extends ServerDataApi<VoiceflowProgram.Program, VoiceflowVersion.Version> {
  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<VoiceflowProgram.Program>(`/prototype-programs/${programID}`);
    return data;
  };
}

export default RemoteDataAPI;
