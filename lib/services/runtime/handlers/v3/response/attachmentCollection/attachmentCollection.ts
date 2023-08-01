import VError from '@voiceflow/verror';

import { AttachmentType } from '../response.types';
import { BaseAttachment } from '../variant/attachment/base.attachment';
import { CardAttachment } from '../variant/attachment/card.attachment';
import { MediaAttachment } from '../variant/attachment/media.attachment';

// $TODO$ - This code is duplicated. Need to abstract out or simplify.
export class AttachmentCollection {
  public readonly cardAttachments: CardAttachment[];

  public readonly mediaAttachments: MediaAttachment[];

  constructor(attachments: BaseAttachment[]) {
    this.cardAttachments = [];
    this.mediaAttachments = [];

    attachments.forEach((attach) => {
      if (this.isCard(attach)) {
        this.cardAttachments.push(attach);
      } else if (this.isMedia(attach)) {
        this.mediaAttachments.push(attach);
      } else {
        throw new VError('unexpected attachment type was received');
      }
    });
  }

  private isCard(attachment: BaseAttachment): attachment is CardAttachment {
    return attachment.type === AttachmentType.CARD;
  }

  private isMedia(attachment: BaseAttachment): attachment is MediaAttachment {
    return attachment.type === AttachmentType.MEDIA;
  }
}
