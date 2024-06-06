import { BaseModels } from "@voiceflow/base-types";
import { IntentRequest } from "@voiceflow/dtos";

export const getSlotNameByID = (id: string, model: BaseModels.PrototypeModel) => {
  return model.slots.find((lmEntity) => lmEntity.key === id)?.name;
};

export const getUnfulfilledEntities = (
  intentRequest: IntentRequest,
  model: BaseModels.PrototypeModel | undefined
): (BaseModels.IntentSlot & { name: string })[] => {

  if (!model) return [];

  const intentModelSlots =
    model.intents.find((intent) => intent.name === intentRequest.payload.intent.name)?.slots || [];
  const extractedEntityNames = new Set(intentRequest.payload.entities.map((entity) => entity.name));

  return intentModelSlots
    .filter((modelIntentEntity) => modelIntentEntity.required)
    .flatMap((modelIntentEntity) => {
      const entityName = getSlotNameByID(modelIntentEntity.id, model);
      // If the required model intent entity is not found in the extracted entity, this is the entity model to return
      if (entityName && !extractedEntityNames.has(entityName)) {
        return { ...modelIntentEntity, name: entityName };
      }
      return [];
    });
};
