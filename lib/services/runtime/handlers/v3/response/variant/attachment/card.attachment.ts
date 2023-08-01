import { BaseTrace } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';

import { serializeResolvedMarkup } from '../../markupUtils/markupUtils';
import { CardAttachment as RawCardAttachment } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseAttachment } from './base.attachment';

export class CardAttachment extends BaseAttachment {
  constructor(protected readonly rawAttachment: RawCardAttachment, varContext: VariableContext) {
    super(rawAttachment, varContext);
  }

  get trace(): BaseTrace.AnyTrace {
    throw new VError('card attachments have no corresponding trace');
  }

  get content() {
    const {
      id,
      title,
      description,
      buttons,
      buttonOrder,
      media: { url },
    } = this.rawAttachment.card;
    return {
      id,
      buttons: buttonOrder.map((id) => buttons[id]),
      title: this.varContext.resolve(title),
      description: this.varContext.resolve(description),
      imageUrl: serializeResolvedMarkup(this.varContext.resolveMarkup(url)),
    };
  }
}
