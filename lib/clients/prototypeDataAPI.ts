import { VoiceflowProgram, VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { MongoDataAPI } from '@/runtime';

class PrototypeDataAPI extends MongoDataAPI<
  VoiceflowProgram.Program,
  VoiceflowVersion.Version,
  VoiceflowProject.Project
> {
  protected programsCollection = 'prototype-programs';
}

export default PrototypeDataAPI;
