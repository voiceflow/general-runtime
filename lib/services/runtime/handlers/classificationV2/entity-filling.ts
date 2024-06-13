import { GeneralRuntime, StorageType } from '../../types';
import { IntentRequest, PrototypeModel, TextRequest, isTextRequest } from '@voiceflow/dtos';
import { BaseModels, BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import { Predictor } from '@/lib/services/predictor';
import { castToDTO } from '@/lib/services/predictor/predictor.utils';
import { VersionTag } from '@voiceflow/base-types/build/cjs/version';
import { DEFAULT_NLU_INTENT_CLASSIFICATION } from '@/lib/services/predictor/predictor.const';

type FillableNode =
  | VoiceflowNode.CaptureV2.Node
  | VoiceflowNode.Interaction.Node

export class EntityFillingHandler {
  constructor(private readonly runtime: GeneralRuntime<TextRequest>) {}

  static canHandle(runtime: GeneralRuntime) {
    const request = runtime.getRequest();
    // const intentRequest = runtime.storage.get<any>(StorageType.DM)?.intentRequest;
    return isTextRequest(request);
  }

  async handle(node: FillableNode) {
    const storedIntentRequest = this.runtime.storage.get<any>(StorageType.DM)?.intentRequest as IntentRequest;
    const filledIntentRequest = await this.fillIntentSlots(node, storedIntentRequest);
    return filledIntentRequest;
  }

  private async fillIntentSlots(node: FillableNode, intentRequest: IntentRequest): Promise<IntentRequest> {

    if (EntityFillingHandler.getUnfulfilledEntities(intentRequest, this.runtime.version?.prototype?.model).length === 0) return intentRequest;

    const versionID = this.runtime.getVersionID();
    const { version, project } = this.runtime;

    const request = this.runtime.getRequest()!;

    const { intents, isTrained, slots } = castToDTO(version as any, project as any);

    const scopedIntent = intents?.find((intent) => intent.name === intentRequest.payload.intent.name);
    const scopedSlots = scopedIntent?.slots
      ?.map((slot) => slots?.find((entity) => entity.key === slot.id))
      .filter((slot): slot is PrototypeModel['slots'][number] => slot != null);

    const filteredIntents = scopedIntent ? [scopedIntent.name] : undefined;
    const filteredEntities = scopedSlots ? scopedSlots.map((slot) => slot.name) : undefined;

    const predictor = new Predictor(
      {
        axios: this.runtime.services.axios,
        mlGateway: this.runtime.services.mlGateway,
        CLOUD_ENV: this.runtime.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_URI: this.runtime.config.NLU_GATEWAY_SERVICE_URI,
        NLU_GATEWAY_SERVICE_PORT_APP: this.runtime.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project!.teamID,
        versionID,
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

    const prediction = await predictor.predict(request.payload);

    const matchedAnotherIntent =
      node.intentScope !== BaseNode.Utils.IntentScope.NODE &&
      typeof prediction?.predictedIntent === 'string' &&
      prediction.predictedIntent !== intentRequest.payload.intent.name &&
      prediction.predictedIntent !== VoiceflowConstants.IntentName.NONE &&
      !!intents!.find((intent) => intent.name === prediction.predictedIntent);
    if (matchedAnotherIntent) {
      const newIntentRequest: IntentRequest = {
        type: BaseRequest.RequestType.INTENT,
        payload: {
          intent: { name: prediction.predictedIntent },
          query: this.runtime.getRequest()?.payload || '',
          entities: prediction.predictedSlots.map((slot => ({ name: slot.name, value: slot.value }))),
          confidence: prediction.confidence,
        },
      };
      return newIntentRequest;
    }

    const entities = scopedSlots?.flatMap((slot) => {
      let value: string | undefined = undefined;

      const existingEntity = intentRequest.payload.entities.find((entity) => entity.name === slot.name);
      if (existingEntity) {
        value = existingEntity.value;
      } else {
        value = prediction?.predictedSlots.find((predictedSlot) => predictedSlot.name === slot.name)?.value;
      }

      if (value === undefined) return [];
      else return {
        name: slot.name,
        value,
      };
    }) ?? [];

    return {
      ...intentRequest,
      payload: {
        ...intentRequest.payload,
        entities,
      },
    };
  }

  private static getUnfulfilledEntities(
    intentRequest: IntentRequest,
    model: BaseModels.PrototypeModel | undefined
  ): (BaseModels.IntentSlot & { name: string })[] {

    if (!model) return [];

    const intentModelSlots =
      model.intents.find((intent) => intent.name === intentRequest.payload.intent.name)?.slots || [];
    const extractedEntityNames = new Set(intentRequest.payload.entities.map((entity) => entity.name));

    return intentModelSlots
      .filter((modelIntentEntity) => modelIntentEntity.required)
      .flatMap((modelIntentEntity) => {
        const entityName = this.getSlotNameByID(modelIntentEntity.id, model);
        // If the required model intent entity is not found in the extracted entity, this is the entity model to return
        if (entityName && !extractedEntityNames.has(entityName)) {
          return { ...modelIntentEntity, name: entityName };
        }
        return [];
      });
  }

  private static getSlotNameByID(id: string, model: BaseModels.PrototypeModel) {
    return model.slots.find((lmEntity) => lmEntity.key === id)?.name;
  };
}
