import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { CommandType, EventType } from '@voiceflow/base-types/build/cjs/node/utils';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { match } from 'ts-pattern';

import Runtime from '@/runtime/lib/Runtime';

import { isIntentInInteraction, isIntentScopeInNode, isInteractionsInNode } from '../dialog/utils';

export const getNoneIntentRequest = ({
  query = '',
  confidence,
}: { query?: string; confidence?: number } = {}): BaseRequest.IntentRequest => ({
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query,
    intent: {
      name: VoiceflowConstants.IntentName.NONE,
    },
    entities: [],
    confidence,
  },
});

const googleIntentMap = GoogleConstants.VOICEFLOW_TO_GOOGLE_INTENT_MAP;
// we dont want to map NONE into Fallback otherwise we might introduce issues on the dialog handler
const { None, ...alexaIntentMap } = AlexaConstants.VoiceflowToAmazonIntentMap;

export const mapChannelData = (data: any, platform?: VoiceflowConstants.PlatformType, hasChannelIntents?: boolean) => {
  // FIXME: PROJ - Adapters
  // google/dfes intents were never given meaningful examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means that sometimes we might predict a VF intent when it should be a google one

  // alexa intents were given some but not exhaustive examples untill https://github.com/voiceflow/general-service/pull/379 was merged
  // this means old programs will hold VF intents, new ones wil hold channel intents
  const mapToUse = match(platform)
    .with(VoiceflowConstants.PlatformType.GOOGLE, () => googleIntentMap)
    .with(VoiceflowConstants.PlatformType.ALEXA, () => {
      if (hasChannelIntents) return alexaIntentMap;
      return {};
    })
    .otherwise(() => ({}));

  return {
    ...data,
    payload: {
      ...data.payload,
      intent: {
        ...data.payload.intent,
        name:
          mapToUse[
            data.payload.intent.name as Exclude<VoiceflowConstants.IntentName, VoiceflowConstants.IntentName.NONE>
          ] ?? data.payload.intent.name,
      },
    },
  };
};

export const setIntersect = (set1: Set<any>, set2: Set<any>) => new Set([...set1].filter((i) => set2.has(i)));

export const getNLUScope = async (
  runtime: Runtime
): Promise<{ availableIntents: string[]; availableEntities: string[] }> => {
  // get command-level scope
  const intentCommands = runtime.stack
    .getFrames()
    .flatMap((frame) => frame.getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>())
    .filter((command) => command.type === CommandType.JUMP && command.event.type === EventType.INTENT);

  const commandIntentNames = new Set(intentCommands.map((command) => command.event.intent));

  const commandEntityNames = new Set(
    intentCommands.flatMap((command) => command.event?.mappings).flatMap((mapping) => mapping?.slot || [])
  );

  // get node-level scope
  const currentFrame = runtime.stack.top();
  const program = await runtime.getProgram(runtime.getVersionID(), currentFrame.getDiagramID());
  const node = program.getNode(currentFrame.getNodeID());

  let nodeInteractionIntentNames: Set<string> = new Set();
  let nodeInteractionEntityNames: Set<string> = new Set();
  if (node && isInteractionsInNode(node)) {
    const intentInteractions = node.interactions.filter(isIntentInInteraction);

    nodeInteractionIntentNames = new Set(intentInteractions.flatMap((interaction) => interaction.event.intent));

    nodeInteractionEntityNames = new Set(
      intentInteractions.flatMap((interaction) => interaction.event.mappings).flatMap((mapping) => mapping?.slot || [])
    );
  }

  // intersect scopes if necessary
  let availableIntentsSet = commandIntentNames;
  let availableEntitiesSet = commandEntityNames;
  if (node && isIntentScopeInNode(node) && node.intentScope === BaseNode.Utils.IntentScope.NODE) {
    availableIntentsSet = setIntersect(commandIntentNames, nodeInteractionIntentNames);
    availableEntitiesSet = setIntersect(commandEntityNames, nodeInteractionEntityNames);
  }

  const availableIntents = Array.from(availableIntentsSet);
  const availableEntities = Array.from(availableEntitiesSet);

  return { availableIntents, availableEntities };
};
