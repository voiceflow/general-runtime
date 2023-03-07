import { VoiceflowProgram, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { MongoDataAPI } from '@/runtime';

class PrototypeDataAPI extends MongoDataAPI<VoiceflowProgram.Program, VoiceflowVersion.Version> {
  protected programsCollection = 'prototype-programs';
}

export default PrototypeDataAPI;
