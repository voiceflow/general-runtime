import { Channel, Language, ResolvedDiscriminator } from '../response.types';

export interface DiscriminatorSelectorReturn {
  discriminator: ResolvedDiscriminator;
  language: Language;
  channel: Channel;
}

export interface DiscriminatorContext {
  currLanguage: Language;
  currChannel: Channel;
  defaultLanguage: Language;
}
