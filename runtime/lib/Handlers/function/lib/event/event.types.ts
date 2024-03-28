export enum EventType {
  GENERAL = 'general',
  INTENT = 'intent',
  TEXT = 'text',
}

export interface BaseEvent {
  type: EventType;
}

export interface GeneralEvent extends BaseEvent {
  type: EventType.GENERAL;
  name: string;
}

export interface IntentEvent extends BaseEvent {
  type: EventType.INTENT;
  name: string;
  confidence?: number;
  entities: Record<
    string,
    {
      name: string;
      value: string;
    }
  >;
  utterance?: string;
}

export interface TextEvent extends BaseEvent {
  type: EventType.TEXT;
  value: string;
}

export type Event = GeneralEvent | IntentEvent | TextEvent;

export interface FunctionRequestContext {
  event?: Event;
}
