import { AlexaConstants } from '@voiceflow/alexa-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import sinon from 'sinon';

import { isUsedIntent, mapChannelData } from '@/lib/services/nlu/utils';

const { expect } = chai;

describe('nlu manager utils unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('mapChannelData', () => {
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

  describe('isUsedIntent', () => {
    it('returns true if intent array is undefined', () => {
      expect(isUsedIntent(undefined, { key: 'abc', name: 'test' })).to.eql(true);
    });

    it('returns false if intent name is undefined', () => {
      expect(isUsedIntent(['test'], undefined)).to.eql(false);
    });

    it('returns true if intent name is in array', () => {
      expect(isUsedIntent(['test'], { key: 'abc', name: 'test' })).to.eql(true);
    });

    it('returns true if intent key is in array', () => {
      expect(isUsedIntent(['abc'], { key: 'abc', name: 'test' })).to.eql(true);
    });

    it('returns false if intent name and key are not in array', () => {
      expect(isUsedIntent(['nope'], { key: 'abc', name: 'test' })).to.eql(false);
    });
  });
});
