import { Context, ContextHandler } from "@/types";
import { AbstractManager } from "../utils";
import { isTextRequest } from "@voiceflow/dtos";
import { StorageType } from "../runtime/types";
import { DMStorage } from "@/runtime/lib/Runtime";

export class ClassificationManager extends AbstractManager implements ContextHandler {
  async handle(context: Context) {
    if (!isTextRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);
    const project = await context.data.api.getProject(version.projectID);

    const currentStore = context.state.storage[StorageType.DM];

    if (this.isSlotFilling(currentStore)) {

    }

    return context;
  }

  private isSlotFilling(currentStore: DMStorage) {
    if (!currentStore.priorIntent) return false;

  }
}
