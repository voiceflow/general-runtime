import { ChatModels } from '@voiceflow/chat-types';
import { GoogleConstants } from '@voiceflow/google-types';
import { VoiceModels } from '@voiceflow/voice-types';

export type VoicePrompt = VoiceModels.Prompt<GoogleConstants.Voice>;
export type ChatPrompt = ChatModels.Prompt;
export type AnyPrompt = VoicePrompt | ChatPrompt;

export const isVoicePrompt = (prompt: unknown): prompt is VoicePrompt => {
  return !!prompt && typeof prompt === 'object' && 'content' in prompt && 'voice' in prompt;
};

export const isChatPrompt = (prompt: unknown): prompt is ChatPrompt => {
  return !!prompt && typeof prompt === 'object' && 'content' in prompt;
};

export const isAnyPrompt = (prompt: unknown): prompt is AnyPrompt => isVoicePrompt(prompt) || isChatPrompt(prompt);
