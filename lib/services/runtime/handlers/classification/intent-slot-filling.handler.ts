import { IntentRequest, PrototypeModel, isIntentRequest, isTextRequest } from '@voiceflow/dtos';
import { VoiceflowConstants, VoiceflowUtils } from '@voiceflow/voiceflow-types';
import { ChatModels } from '@voiceflow/chat-types';
import { VoiceModels } from '@voiceflow/voice-types';
import { sample } from 'lodash';

import { Action, Store } from '@/runtime';
import { VersionTag } from '@/types';
import { DebugEvent, Predictor } from '@/lib/services/predictor';
import { castToDTO } from '@/lib/services/predictor/predictor.utils';
import { DEFAULT_NLU_INTENT_CLASSIFICATION } from '@/lib/services/predictor/predictor.const';

import { GeneralRuntime, StorageType } from '../../types';
import { getUnfulfilledEntities } from './intent-slot-filling.utils';
import { fillStringEntities } from '@/lib/services/dialog/utils';
import { inputToString } from '../utils/output';
import { addOutputTrace, getOutputTrace } from '../../utils';
import { BaseNode, BaseTrace } from '@voiceflow/base-types';

export const IntentSlotFillingHandler = () => ({
  canHandle: (runtime: GeneralRuntime) => {
    const request = runtime.storage.get<any>(StorageType.DM)?.previousIntentRequest;
    return isIntentRequest(request) && getUnfulfilledEntities(request, runtime.version?.prototype?.model).length > 0
  },
  handle: async <TNode extends {id: string}>(node: TNode, runtime: GeneralRuntime, variables: Store): Promise<string | null> => {
    const runtimeAction = runtime.getAction();
    const versionID = runtime.getVersionID();
    const {version, project} = runtime;

    let slotFillingRequest = runtime.storage.get<any>(StorageType.DM)?.previousIntentRequest as IntentRequest;

    // if (runtimeAction === Action.RUNNING) {
    //   const unfulfilledEntities = getUnfulfilledEntities(slotFillingRequest, runtime.version?.prototype?.model);
    //   const firstUnfulfilledEntity = unfulfilledEntities[0];

    //   const prompt = sample(firstUnfulfilledEntity.dialog.prompt)! as
    //     | ChatModels.Prompt
    //     | VoiceModels.IntentPrompt<VoiceflowConstants.Voice>;

    //   const output = VoiceflowUtils.prompt.isIntentVoicePrompt(prompt)
    //       ? fillStringEntities(
    //           slotFillingRequest as any,
    //           inputToString(prompt, (version?.platformData.settings as any).defaultVoice)
    //         )
    //       : prompt.content;

    //     const variableStore = new Store(variables);
    //     addOutputTrace(
    //       runtime,
    //       getOutputTrace({
    //         output,
    //         version,
    //         variables,
    //         isPrompt: true,
    //       }),
    //       { variables: variableStore }
    //     );

    //   return node.id;
    // }

    const request = runtime.getRequest();
    const query = isTextRequest(request) ? request.payload : null;
    if (!query) return null;

    const { intents, isTrained, slots } = castToDTO(version as any, project as any);

    const scopedIntent = intents?.find((intent) => intent.name === slotFillingRequest.payload.intent.name);
    const scopedSlots = scopedIntent?.slots
      ?.map((slot) => slots?.find((entity) => entity.key === slot.id))
      .filter((slot): slot is PrototypeModel['slots'][number] => slot != null);

    const filteredIntents = scopedIntent ? [scopedIntent.name] : undefined;
    const filteredEntities = scopedSlots ? scopedSlots.map((slot) => slot.name) : undefined;

    const predictor = new Predictor(
      {
        axios: runtime.services.axios,
        mlGateway: runtime.services.mlGateway,
        CLOUD_ENV: runtime.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_URI: runtime.config.NLU_GATEWAY_SERVICE_URI,
        NLU_GATEWAY_SERVICE_PORT_APP: runtime.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project!.teamID,
        versionID: versionID,
        tag: project!.liveVersion === versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
        intents: intents ?? [],
        slots: slots ?? [],
        isTrained,
      },
      DEFAULT_NLU_INTENT_CLASSIFICATION,
      {
        locale: version?.prototype?.data.locales[0] as VoiceflowConstants.Locale,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
        filteredIntents,
        excludeFilteredIntents: filteredIntents ? false : undefined,
        filteredEntities,
        excludeFilteredEntities: filteredEntities ? false : undefined,
      }
    );

    const debugTrace = (message: string): BaseTrace.DebugTrace => ({
      type: BaseNode.Utils.TraceType.DEBUG,
      payload: {
        message,
      },
    });

    const addDebug = (event: DebugEvent) => {
      const prefix = `[Slot Filling] ${event.type.toUpperCase()}: `;
      const trace = debugTrace(`${prefix}${event.message}`);

      runtime.trace.addTrace(trace);
    };

    predictor.on('debug', addDebug);

    const prediction = await predictor.predict(query);

    const slotsMatched = (prediction?.predictedSlots ?? []).flatMap((predictedSlot) => {
      const slot = scopedSlots?.find((scopedSlot) => scopedSlot?.name === predictedSlot.name);
      if (!slot) return [];

      const existingEntity = slotFillingRequest.payload.entities.find((entity) => entity.name === slot.name);
      if (existingEntity) {
        existingEntity.value = predictedSlot.value;
        return existingEntity.name;
      } else {
        slotFillingRequest.payload.entities.push({
          name: slot.name,
          value: predictedSlot.value,
        });
        return slot.name;
      }
    });

    if (slotsMatched.length === 0) {
      if ((node as any).intentScope === 'GLOBAL') {
        slotFillingRequest = prediction?.predictedIntent as any;
      }
    }

    runtime.storage.set(StorageType.DM, {
      ...runtime.storage.get(StorageType.DM) ?? {},
      previousIntentRequest: slotFillingRequest
    });

    const slotFillingHandler = IntentSlotFillingHandler();
    if (slotFillingHandler.canHandle(runtime)) {
      runtime.setAction(Action.RUNNING)
      const slotFillingResult = await slotFillingHandler.handle(node, runtime, variables);
      if (slotFillingResult != null) {
        return slotFillingResult;
      }
    } else {
      delete (runtime.storage.get(StorageType.DM) as any).previousIntentRequest;

      runtime.setRequest(slotFillingRequest);
    }

    return null;
  }
});
