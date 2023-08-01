import { BaseTrace } from '@voiceflow/base-types';

import { AttachmentCollection } from '../attachmentCollection/attachmentCollection';
import { VariantCollection } from '../variantCollection/variantCollection';
import { evaluateCarousel } from './evaluateCarousel/evaluateCarousel';

function selectUnconditioned(variants: VariantCollection) {
  const randomIndex = Math.floor(Math.random() * variants.unconditionedVars.length);
  return variants.unconditionedVars[randomIndex];
}

const selectConditioned = (variants: VariantCollection) => {
  return variants.conditionedVars.find((vari) => vari.condition!.evaluate());
};

export const evaluateVariant = async (variants: VariantCollection) => {
  // 1 - Select a variant
  const variant = selectConditioned(variants) ?? selectUnconditioned(variants);

  // 2 - Separate the card and non-card attachments
  const attachmentCollection = new AttachmentCollection(variant.attachments);

  // 3 - Output response trace
  const responseTrace = await variant.trace();

  // 4 - Output carousel trace
  const carouselTrace = attachmentCollection.cardAttachments.length
    ? evaluateCarousel(variant.cardLayout, attachmentCollection.cardAttachments)
    : null;

  // 5 - Output non-carousel attachments as tarces
  const attachmentTraces = attachmentCollection.mediaAttachments.map((attach) => attach.trace);

  // 6 - Aggregate traces
  const outputTraces: BaseTrace.BaseTraceFrame[] = [];
  if (responseTrace) outputTraces.push(responseTrace);
  if (carouselTrace) outputTraces.push(carouselTrace);
  return [...outputTraces, ...attachmentTraces];
};
