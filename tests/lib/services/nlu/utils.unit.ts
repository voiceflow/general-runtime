import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode } from '@voiceflow/base-types';
import { CommandType, EventType } from '@voiceflow/base-types/build/cjs/node/utils';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import chai from 'chai';
import sinon from 'sinon';

import { getAvailableIntentsAndEntities, mapChannelData } from '@/lib/services/nlu/utils';

import { getMockRuntime } from './fixture';

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

  describe('getAvailableIntentsAndEntities', () => {
    const mockContext = { data: { api: sinon.stub() } };
    const mockPizzaIntent = {
      type: EventType.INTENT,
      intent: 'Pizza',
      mappings: [{ slot: 'foo' }, { slot: 'bar' }],
    };
    const mockYesIntent = { type: EventType.INTENT, intent: 'VF.YES', mappings: [{ slot: 'baz' }] };
    const mockNoIntent = { type: EventType.INTENT, intent: 'VF.NO', mappings: [{ slot: 'qux' }] };

    it('takes intersection when node is scoped', async () => {
      const mockNodeInteractions = [
        { event: mockPizzaIntent },
        { event: mockYesIntent },
        { event: mockNoIntent },
      ];

      const mockNode = {
        interactions: mockNodeInteractions,
        intentScope: BaseNode.Utils.IntentScope.NODE,
      };

      const mockCommands = [
        {
          type: CommandType.JUMP,
          event: mockYesIntent,
        },
        {
          type: CommandType.JUMP,
          event: mockPizzaIntent,
        },
      ];

      const runtimeClient = {
        createRuntime: sinon.stub().returns(getMockRuntime(mockCommands, mockNode)),
      };

      const mockRuntimeManager = {
        createClient: sinon.stub().returns(runtimeClient),
      };

      const { availableIntents, availableEntities } = await getAvailableIntentsAndEntities(
        mockRuntimeManager as any,
        mockContext as any
      );

      expect(availableIntents).to.eql(new Set(['VF.YES', 'Pizza']));
      expect(availableEntities).to.eql(new Set(['baz', 'foo', 'bar']));
    });

    it('ignores node level when intentScope is global', async () => {
      const mockNodeInteractions = [
        {
          event: mockYesIntent,
        },
      ];

      const mockNode = {
        interactions: mockNodeInteractions,
        intentScope: BaseNode.Utils.IntentScope.GLOBAL,
      };

      const mockCommands = [
        {
          type: CommandType.JUMP,
          event: mockNoIntent,
        },
      ];

      const runtimeClient = {
        createRuntime: sinon.stub().returns(getMockRuntime(mockCommands, mockNode)),
      };

      const mockRuntimeManager = {
        createClient: sinon.stub().returns(runtimeClient),
      };

      const { availableIntents, availableEntities } = await getAvailableIntentsAndEntities(
        mockRuntimeManager as any,
        mockContext as any
      );

      expect(availableIntents).to.eql(new Set(['VF.NO']));
      expect(availableEntities).to.eql(new Set(['qux']));
    });

    it('works with empty params', async () => {
      const runtimeClient = {
        createRuntime: sinon.stub().returns(getMockRuntime()),
      };

      const mockRuntimeManager = {
        createClient: sinon.stub().returns(runtimeClient),
      };

      const { availableIntents, availableEntities } = await getAvailableIntentsAndEntities(
        mockRuntimeManager as any,
        mockContext as any
      );

      expect(availableIntents).to.eql(new Set([]));
      expect(availableEntities).to.eql(new Set([]));
    });
  });
});
