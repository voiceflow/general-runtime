export enum Storage {
  OUTPUT = 'output',
  PRIOR_OUTPUT = 'priorOutput',
  SESSIONS = 'sessions',
  REPEAT = 'repeat',
  LOCALE = 'locale',
  USER = 'user',
  NO_INPUTS_COUNTER = 'noInputsCounter',
  NO_MATCHES_COUNTER = 'noMatchesCounter',
  REPROMPT = 'reprompt',
  MODEL_VERSION = 'modelVersion',
}

export enum Turn {
  END = 'end',
  PREVIOUS_OUTPUT = 'lastOutput',
  REQUEST = 'request',
  CARD = 'card',
  STREAM_PLAY = 'stream_play',
  CHIPS = 'chips',
  DIRECTIVES = 'directives',
  DF_ES_IMAGE = 'df-es-image',
  DF_ES_PAYLOAD = 'df-es-payload',
  DF_ES_TEXT_ENABLED = 'df-es-text-enabled',
  GOTO = 'goto',
  TURN_ID_PROMISE = 'turnid',
}

export enum Frame {
  SPEAK = 'speak',
  CALLED_COMMAND = 'calledCommand',
}

export enum Variables {
  TIMESTAMP = 'timestamp',
  DF_ES_CHANNEL = 'channel',
  LAST_UTTERANCE = 'last_utterance',
}

export default {
  Storage,
  Turn,
  Frame,
};
