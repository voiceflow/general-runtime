import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';

import { CardLayout } from '../../response.types';
import { CardAttachment } from '../../variant/attachment/card.attachment';

function convertLayout(cardLayout: CardLayout): BaseNode.Carousel.CarouselLayout {
  switch (cardLayout) {
    case CardLayout.CAROUSEL:
      return BaseNode.Carousel.CarouselLayout.CAROUSEL;
    case CardLayout.LIST:
      return BaseNode.Carousel.CarouselLayout.LIST;
    default:
      throw new VError('unexpected value for card layout');
  }
}

const evaluateCard = (card: CardAttachment): BaseNode.Carousel.TraceCarouselCard => {
  const { id, title, description, buttons, imageUrl } = card.content;
  return {
    id, // $TODO$ - Is it reasonable to use the CMS resource ID? Previously this was defined using a frontend CUID
    title,
    description: {
      text: description,
      slate: [], // $TODO$ - Can we remove `slate` altogether somehow?
    },
    imageUrl,
    buttons,
  };
};

export const evaluateCarousel = (cardLayout: CardLayout, cards: CardAttachment[]): BaseTrace.Carousel => ({
  type: BaseTrace.TraceType.CAROUSEL,
  payload: {
    cards: cards.map(evaluateCard),
    layout: convertLayout(cardLayout),
  },
});
