import VError from '@voiceflow/verror';

import { Channel, Language, ResolvedDiscriminator } from '../response.types';
import { DiscriminatorContext, DiscriminatorSelectorReturn } from './selectDiscriminator.interface';

const discKey = (language: Language, channel: Channel) => `${language}-${channel}`;

const preprocessDiscriminators = (discriminators: ResolvedDiscriminator[]) =>
  new Map<string, ResolvedDiscriminator>(discriminators.map((disc) => [discKey(disc.language, disc.channel), disc]));

export function selectDiscriminator(
  context: DiscriminatorContext,
  discriminators: ResolvedDiscriminator[]
): DiscriminatorSelectorReturn {
  const discMap = preprocessDiscriminators(discriminators);

  // Case 1 - There exists an override for current (language, channel)
  const selectedDisc = discMap.get(discKey(context.currLanguage, context.currChannel));
  if (selectedDisc) {
    return {
      discriminator: selectedDisc,
      language: context.currLanguage,
      channel: context.currChannel,
    };
  }

  // Case 2 - There is no override for current channel, so check if there is a default channel override
  const defaultChannelDisc = discMap.get(discKey(context.currLanguage, Channel.DEFAULT));
  if (defaultChannelDisc) {
    return {
      discriminator: defaultChannelDisc,
      language: context.currLanguage,
      channel: Channel.DEFAULT,
    };
  }

  // Case 3 - There is not any explicit overrides for the current language, so auto-translate from default language.
  const defaultChanAndLangDisc = discMap.get(discKey(context.defaultLanguage, Channel.DEFAULT));

  if (!defaultChanAndLangDisc) {
    throw new VError(`Received invalid data missing content for the default channel and default language.`);
  }

  return {
    discriminator: defaultChanAndLangDisc,
    language: context.defaultLanguage,
    channel: Channel.DEFAULT,
  };
}
