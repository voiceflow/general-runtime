import { CompiledDiscriminatorKey, CompiledResponse, Language } from '@voiceflow/dtos';

import { Channel } from './channel.enum';

const toDiscriminatorKey = (channel: Channel, language: Language): CompiledDiscriminatorKey => `${channel}:${language}`;

export function selectDiscriminator(response: CompiledResponse, currentChannel: Channel, currentLanguage: Language) {
  const discriminatorKey = toDiscriminatorKey(currentChannel, currentLanguage);
  return response.variants[discriminatorKey];
}
