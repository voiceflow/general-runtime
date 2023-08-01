import { BaseTrace } from '@voiceflow/base-types';

import { AttachmentType, ResolvedAttachment } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';

export abstract class BaseAttachment {
  protected constructor(
    protected readonly rawAttachment: ResolvedAttachment,
    protected readonly varContext: VariableContext
  ) {}

  public get type(): AttachmentType {
    return this.rawAttachment.type;
  }

  public abstract get trace(): BaseTrace.BaseTraceFrame;
}
