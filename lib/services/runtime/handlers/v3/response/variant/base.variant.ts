import { BaseTrace } from '@/../libs/packages/base-types/build/cjs';

import { ResolvedVariant } from '../response.types';
import { VariableContext } from '../variableContext/variableContext';
import { buildAttachment } from './attachment/attachment';
import { BaseAttachment } from './attachment/base.attachment';
import { BaseCondition } from './condition/base.condition';
import { buildCondition } from './condition/condition';

export abstract class BaseVariant<Variant extends ResolvedVariant> {
  private cachedCondition: BaseCondition | null = null;

  private cachedAttachments: BaseAttachment[] | null = null;

  protected constructor(protected readonly rawVariant: Variant, protected readonly varContext: VariableContext) {}

  public abstract trace(): (BaseTrace.AnyTrace | null) | Promise<BaseTrace.AnyTrace | null>;

  public get cardLayout() {
    return this.rawVariant.cardLayout;
  }

  public get type(): Variant['type'] {
    return this.rawVariant.type;
  }

  public get condition(): BaseCondition | null {
    if (this.rawVariant.condition === null) return null;
    if (!this.cachedCondition) {
      this.cachedCondition = buildCondition(this.rawVariant.condition, this.varContext);
    }
    return this.cachedCondition;
  }

  public get attachments(): BaseAttachment[] {
    if (!this.cachedAttachments) {
      this.cachedAttachments = this.rawVariant.attachmentOrder.map((id) =>
        buildAttachment(this.rawVariant.attachments[id], this.varContext)
      );
    }

    return this.cachedAttachments;
  }
}
