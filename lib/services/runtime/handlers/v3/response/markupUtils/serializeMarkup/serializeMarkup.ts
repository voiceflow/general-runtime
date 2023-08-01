import { BaseMarkup as ResolvedMarkup } from '@voiceflow/base-types';

import { ResolvedMarkupAttributes } from './serializeMarkup.interface';
import { AttributeResolver } from './serializeMarkup.types';

// $TODO$ - Implementation here is placeholder. In fact, serializing this on our end
//          might not even be useful.
const attributeResolvers: Record<string, AttributeResolver> = {
  [ResolvedMarkupAttributes.BOLD]: (content) => `**${content}**`,
  [ResolvedMarkupAttributes.ITALICS]: (content) => `_${content}_`,
  [ResolvedMarkupAttributes.UNDERLINE]: (content) => `<ins>${content}</ins>`,
};

const supportedAttributes = new Set(Object.keys(attributeResolvers));

const applyAttributes = (serializedMarkup: string, attributes: Record<string, unknown>) =>
  Object.entries(attributes).reduce((acc: string, entry) => {
    const [attr, val] = entry;
    if (supportedAttributes.has(attr)) {
      return attributeResolvers[attr](acc, val);
    }
    return serializedMarkup;
  }, serializedMarkup);

function serializeResolvedMarkupNode(markup: ResolvedMarkup.MarkupNode): string {
  if (typeof markup === 'string') return markup;

  const serializedChild = serializeResolvedMarkupCollection(markup.text);

  return applyAttributes(serializedChild, markup.attributes);
}

const serializeResolvedMarkupCollection = (markup: ResolvedMarkup.Markup): string =>
  markup.map(serializeResolvedMarkupNode).join('');

export const serializeResolvedMarkup = (markup: ResolvedMarkup.Markup): string =>
  serializeResolvedMarkupCollection(markup);
