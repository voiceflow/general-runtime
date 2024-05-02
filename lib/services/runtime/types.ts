import { BaseNode, BaseRequest, BaseText } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';

import type { DataAPI, Runtime } from '@/runtime';

import type { FullServiceMap } from '..';

export type RuntimeRequest = DTO.BaseRequest | null;

export type GeneralRuntime = Runtime<RuntimeRequest, DataAPI, FullServiceMap>;

/**
 * Please remove this function once `@voiceflow/base-types` is fully replaced by `@voiceflow/dtos`.
 *
 * Needed to resolve an annoying edge-case where `value: z.unknown()` causes Zod to type the
 * value as `value?: unknown` but this cannot be assigned to `value: unknown` from `@voiceflow/base-types`.
 *
 * Not sure why zod@3.22.4 does this instead of:
 *  1. Typing `value: z.unknown()` as `value: unknown` and
 *  2. Typing `value: z.unknown().optional()` as `value?: unknown`
 * which would more naturally map to TS.
 *
 * To resolve the type issue, we create this utility function to ensure that the `payload` property on
 * each action is defined (as `payload: undefined` as a fallback).
 */
export const toBaseTypesIntent = (intent: DTO.IntentRequest): BaseRequest.IntentRequest => ({
  ...intent,
  type: BaseRequest.RequestType.INTENT,
  payload: {
    ...intent.payload,
    actions: intent.payload.actions?.map(
      (action): BaseRequest.Action.BaseAction => ({ payload: undefined, ...action })
    ),
  },
});

export interface Prompt {
  content: BaseText.SlateTextValue | string;
  voice?: string;
}

export const isRuntimeRequest = (request: unknown): request is RuntimeRequest => {
  return request === null || DTO.BaseRequestDTO.safeParse(request).success;
};

export const isPrompt = (prompt: unknown): prompt is Prompt => {
  if (!prompt || typeof prompt !== 'object') return false;
  return 'content' in prompt;
};

export enum StorageType {
  DM = 'dm',
  USER = 'user',
  LOCALE = 'locale',
  REPEAT = 'repeat',
  SESSIONS = 'sessions',
  STREAM_PLAY = 'streamPlay',
  ACCESS_TOKEN = 'accessToken',
  STREAM_PAUSE = 'streamPause',
  STREAM_FINISHED = 'streamFinished',
  NO_MATCHES_COUNTER = 'noMatchesCounter',
  NO_REPLIES_COUNTER = 'noRepliesCounter',
}

export enum StreamAction {
  END = 'END',
  NEXT = 'NEXT',
  START = 'START',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  LOOP = 'LOOP',
  NOEFFECT = 'NOEFFECT',
}

export enum StreamAudioDirective {
  ENQUEUE = 'ENQUEUE',
  REPLACE_ALL = 'REPLACE_ALL',
}

export enum SegmentEventType {
  KB_TAGS_USED = 'AI - KB Tags Used',
  AI_REQUEST = 'AI Request',
}

export interface StreamPlayStorage {
  src: string;
  loop: boolean;
  title?: string;
  iconImage?: string;
  description?: string;
  backgroundImage?: string;
  token: string;
  action: StreamAction;
  offset: number;
  nodeID: NonNullable<BaseNode.Utils.NodeID>;
  nextID?: BaseNode.Utils.NodeID;
  pauseID?: BaseNode.Utils.NodeID;
  previousID?: BaseNode.Utils.NodeID;
}

export interface StreamPauseStorage {
  id: string;
  offset: number;
}

export type NoMatchCounterStorage = number;
export type NoReplyCounterStorage = number;

export type StorageData = Partial<{
  [StorageType.STREAM_PLAY]: StreamPlayStorage;
  [StorageType.STREAM_PAUSE]: StreamPauseStorage;
  [StorageType.NO_MATCHES_COUNTER]: NoMatchCounterStorage;
  [StorageType.NO_REPLIES_COUNTER]: NoReplyCounterStorage;
}>;

export enum TurnType {
  END = 'end',
  TRACE = 'trace',
  AUDIO = 'play',
  REPROMPT = 'reprompt',
  NEW_STACK = 'newStack',
  PREVIOUS_OUTPUT = 'lastOutput',
  STOP_ALL = 'stopAll',
  STOP_TYPES = 'stopTypes',
}

export type Output = BaseText.SlateTextValue | string;

export type TurnData = Partial<{
  [TurnType.PREVIOUS_OUTPUT]: Output;
}>;

export enum FrameType {
  IS_BASE = 'isBase',
  OUTPUT = 'output',
  CALLED_COMMAND = 'calledCommand',
}

export type FrameData = Partial<{
  [FrameType.OUTPUT]: Output;
}>;
