import { AlexaConstants } from '@voiceflow/alexa-types';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import sinon from 'sinon';

import { mapChannelData } from '@/lib/services/nlu/utils';

const { expect } = chai;

describe('nlu manager utils unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('mapChannelData', () => {
    it(`maps vf intents for google platform`, async () => {
      const inputData = { payload: { intent: { name: VoiceflowConstants.IntentName.YES } } };
      const outputData = mapChannelData(inputData, VoiceflowConstants.PlatformType.GOOGLE);

      const expectData = { payload: { intent: { name: GoogleConstants.GoogleIntent.YES } } };
      expect(outputData).to.eql(expectData);
    });

    // ALEXA
    it('maps vf intents for alexa platform (version with channel intents)', async () => {
      const inputData = { payload: { intent: { name: VoiceflowConstants.IntentName.YES } } };
      const outputData = mapChannelData(inputData, VoiceflowConstants.PlatformType.ALEXA, true);

      const expectData = { payload: { intent: { name: AlexaConstants.AmazonIntent.YES } } };
      expect(outputData).to.eql(expectData);
    });

    it('doesnt vf intents for alexa platform (version without channel intents)', async () => {
      const inputData = { payload: { intent: { name: VoiceflowConstants.IntentName.YES } } };
      const outputData = mapChannelData(inputData, VoiceflowConstants.PlatformType.ALEXA);

      const expectData = { payload: { intent: { name: VoiceflowConstants.IntentName.YES } } };
      expect(outputData).to.eql(expectData);
    });

    it('doesnt map alexa intents for alexa platform', async () => {
      const inputData = { payload: { intent: { name: AlexaConstants.AmazonIntent.YES } } };
      const outputData = mapChannelData(inputData, VoiceflowConstants.PlatformType.ALEXA);

      const expectData = { payload: { intent: { name: AlexaConstants.AmazonIntent.YES } } };
      expect(outputData).to.eql(expectData);
    });
  });
});
