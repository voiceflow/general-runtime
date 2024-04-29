import { BaseNode, BaseRequest, BaseText } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';

import type { DataAPI, Runtime } from '@/runtime';

import type { FullServiceMap } from '..';

export type RuntimeRequest = BaseRequest.BaseRequest | null;

export type GeneralRuntime = Runtime<RuntimeRequest, DataAPI, FullServiceMap>;

export interface AlexaIntentRequest extends BaseRequest.IntentRequest {
  payload: Omit<BaseRequest.IntentRequestPayload, 'data'> & {
    data: Record<string, unknown>;
  };
}

export interface Prompt {
  content: BaseText.SlateTextValue | string;
  voice?: string;
}

export const isTextRequest = (request?: RuntimeRequest): request is BaseRequest.TextRequest =>
  !!request && DTO.isTextRequest(request);

/**
 * Intent request is being reused for both Alexa events and intent events. To distinguish them we check
 * if `request.payload.data` exists, if so this is an Alexa event request
 * otherwise it is a normal intent request
 */
export const isIntentRequest = (request?: RuntimeRequest): request is BaseRequest.IntentRequest =>
  !!request && DTO.isIntentRequest(request) && Array.isArray(request.payload.entities) && !request.payload?.data;

export const isAlexaEventIntentRequest = (request?: RuntimeRequest): request is AlexaIntentRequest =>
  !!request && DTO.isIntentRequest(request) && Array.isArray(request.payload.entities) && !!request.payload?.data;

export const isActionRequest = (request?: RuntimeRequest): request is BaseRequest.ActionRequest =>
  !!request && DTO.isActionRequest(request);

export const isPathRequest = (request?: RuntimeRequest): request is BaseRequest.GeneralRequest =>
  !!request &&
  DTO.isGeneralRequest(request) &&
  request.type.startsWith('path-') &&
  typeof request.payload?.label === 'string';

export const isRuntimeRequest = (request: any): request is RuntimeRequest => {
  return request === null || !!(typeof request.type === 'string' && !!request.type);
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
