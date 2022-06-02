import { BaseNode, BaseRequest, BaseText } from '@voiceflow/base-types';

import { Runtime } from '@/runtime';

export type RuntimeRequest = BaseRequest.BaseRequest | null;

export type GeneralRuntime = Runtime<RuntimeRequest>;

export const isTextRequest = (request?: RuntimeRequest | null): request is BaseRequest.TextRequest =>
  !!request && BaseRequest.isTextRequest(request) && typeof request.payload === 'string';

export const isIntentRequest = (request?: RuntimeRequest | null): request is BaseRequest.IntentRequest =>
  !!request &&
  BaseRequest.isIntentRequest(request) &&
  !!request.payload?.intent?.name &&
  Array.isArray(request.payload.entities);

export const isActionRequest = (request?: RuntimeRequest | null): request is BaseRequest.ActionRequest =>
  !!request && BaseRequest.isActionRequest(request);

export const isRuntimeRequest = (request: any): request is RuntimeRequest => {
  return request === null || !!(typeof request.type === 'string' && !!request.type);
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
  NOEFFECT = 'NOEFFECT',
}

export enum StreamAudioDirective {
  ENQUEUE = 'ENQUEUE',
  REPLACE_ALL = 'REPLACE_ALL',
}

export interface StreamPlayStorage {
  src: string;
  loop: boolean;
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
  OUTPUT = 'output',
  CALLED_COMMAND = 'calledCommand',
}

export type FrameData = Partial<{
  [FrameType.OUTPUT]: Output;
}>;

export enum Variables {
  TIMESTAMP = 'timestamp',
  LAST_UTTERANCE = 'last_utterance',
  INTENT_CONFIDENCE = 'intent_confidence',
  USER_ID = 'user_id',
}
