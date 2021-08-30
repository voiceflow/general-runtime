import { Node, Request, Text } from '@voiceflow/base-types';

import { Runtime } from '@/runtime';

export type RuntimeRequest = Request.BaseRequest | null;

export type GeneralRuntime = Runtime<RuntimeRequest>;

export const isTextRequest = (request?: RuntimeRequest | null): request is Request.TextRequest =>
  !!request && Request.isTextRequest(request) && typeof request.payload === 'string';

export const isIntentRequest = (request?: RuntimeRequest | null): request is Request.IntentRequest =>
  !!request && Request.isIntentRequest(request) && !!request.payload?.intent?.name && Array.isArray(request.payload.entities);

export const isActionRequest = (request?: RuntimeRequest | null): request is Request.ActionRequest => !!request && Request.isActionRequest(request);

export const isRuntimeRequest = (request: any): request is RuntimeRequest => {
  return request === null || !!(typeof request.type === 'string' && !!request.type);
};

export enum StorageType {
  USER = 'user',
  LOCALE = 'locale',
  REPEAT = 'repeat',
  SESSIONS = 'sessions',
  STREAM_PLAY = 'streamPlay',
  ACCESS_TOKEN = 'accessToken',
  STREAM_PAUSE = 'streamPause',
  STREAM_FINISHED = 'streamFinished',
  NO_MATCHES_COUNTER = 'noMatchesCounter',
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

export type StreamPlayStorage = {
  src: string;
  loop: boolean;
  token: string;
  action: StreamAction;
  offset: number;
  nodeID: NonNullable<Node.Utils.NodeID>;
  nextID?: Node.Utils.NodeID;
  pauseID?: Node.Utils.NodeID;
  previousID?: Node.Utils.NodeID;
};

export type StreamPauseStorage = {
  id: string;
  offset: number;
};

export type NoMatchCounterStorage = number;

export type StorageData = Partial<{
  [StorageType.STREAM_PLAY]: StreamPlayStorage;
  [StorageType.STREAM_PAUSE]: StreamPauseStorage;
  [StorageType.NO_MATCHES_COUNTER]: NoMatchCounterStorage;
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

export type Output = Text.SlateTextValue | string;

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
}
