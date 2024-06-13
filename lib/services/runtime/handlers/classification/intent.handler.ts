import { TextRequest, isTextRequest } from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { Action, Store } from '@/runtime';
import { Predictor, DebugEvent } from '@/lib/services/predictor'
import { castToDTO } from '@/lib/services/predictor/predictor.utils';
import { VersionTag } from '@/types';

import { getIntentRequest } from './intent.utils';
import { GeneralRuntime, StorageType } from '../../types';
import { IntentSlotFillingHandler } from './intent-slot-filling.handler';

export const utilsObj = {
  intentSlotFillingHandler: IntentSlotFillingHandler(),
}

export const IntentClassificationHandler = (utils: typeof utilsObj = utilsObj) => ({
  canHandle: (runtime: GeneralRuntime): runtime is GeneralRuntime<TextRequest> => isTextRequest(runtime.getRequest()),
  handle: async <TNode extends { id: string }>(node: TNode, runtime: GeneralRuntime<TextRequest>, variables: Store): Promise<string | null> => {
    const request = runtime.getRequest()!;
    const versionID = runtime.getVersionID();
    const {version, project} = runtime;
    const { intentClassificationSettings, intents, isTrained, slots } = castToDTO(version as any, project as any);

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
      intentClassificationSettings,
      {
        locale: version?.prototype?.data.locales[0] as VoiceflowConstants.Locale,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      }
    );

    const debugTrace = (message: string): BaseTrace.DebugTrace => ({
      type: BaseNode.Utils.TraceType.DEBUG,
      payload: {
        message,
      },
    });

    const addDebug = (event: DebugEvent) => {
      const prefix = `[Intent Classification] ${event.type.toUpperCase()}: `;
      const trace = debugTrace(`${prefix}${event.message}`);

      runtime.trace.addTrace(trace);
    };

    predictor.on('debug', addDebug);

    try {
      const prediction = await predictor.predict(request.payload);
      const intentRequest = getIntentRequest(prediction);
      runtime.setRequest(intentRequest);

      runtime.storage.set(StorageType.DM, {
        ...runtime.storage.get(StorageType.DM) ?? {},
        previousIntentRequest: intentRequest
      });

      if (utils.intentSlotFillingHandler.canHandle(runtime)) {
        // runtime.setAction(Action.RUNNING)
        // const slotFillingResult = await utils.intentSlotFillingHandler.handle(node, runtime, variables);
        // if (slotFillingResult != null) {
        //   return slotFillingResult;
        // }
      } else {
        delete (runtime.storage.get(StorageType.DM) as any).previousIntentRequest;

        runtime.setRequest(intentRequest);
      }
    } finally {
      predictor.off('debug', addDebug);
    }

    return null;
  }
});
