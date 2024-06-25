import { Channel, CompiledDiscriminatorKey, CompiledMessage, Language } from '@voiceflow/dtos';

const toDiscriminatorKey = (channel: Channel, language: Language): CompiledDiscriminatorKey => `${channel}:${language}`;

export function selectDiscriminator(message: CompiledMessage, currentChannel: Channel, currentLanguage: Language) {
  const discriminatorKey = toDiscriminatorKey(currentChannel, currentLanguage);
  return message.variants[discriminatorKey];
}
