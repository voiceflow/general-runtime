import { BaseTrace } from '@voiceflow/base-types';

import { serializeResolvedMarkup } from '../../markupUtils/markupUtils';
import { MediaAttachment as RawMediaAttachment, MediaDatatype } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseAttachment } from './base.attachment';

export class MediaAttachment extends BaseAttachment {
  constructor(protected readonly rawAttachment: RawMediaAttachment, varContext: VariableContext) {
    super(rawAttachment, varContext);
  }

  get trace(): BaseTrace.V3.VideoTrace | BaseTrace.V3.ImageTrace {
    return {
      type:
        this.rawAttachment.media.datatype === MediaDatatype.IMAGE
          ? BaseTrace.TraceType.IMAGE
          : BaseTrace.TraceType.VIDEO,
      payload: {
        url: serializeResolvedMarkup(this.varContext.resolveMarkup(this.rawAttachment.media.url)),
      },
    };
  }
}
