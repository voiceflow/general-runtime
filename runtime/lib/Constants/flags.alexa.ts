export enum Storage {
  ALEXA_PERMISSIONS = 'alexa_permissions',
  OUTPUT = 'output',
  SESSIONS = 'sessions',
  REPEAT = 'repeat',
  LOCALE = 'locale',
  USER = 'user',
  SUPPORTED_INTERFACES = 'supported_interfaces',
  ACCESS_TOKEN = 'accessToken',
  PERMISSIONS = 'permissions',
  PAYMENT = 'payment',
  CANCEL_PAYMENT = 'cancelPayment',
  DISPLAY_INFO = 'displayInfo',
  STREAM_PLAY = 'streamPlay',
  STREAM_PAUSE = 'streamPause',
  STREAM_FINISHED = 'streamFinished',
  STREAM_TEMP = 'streamTemp',
  NO_MATCHES_COUNTER = 'noMatchesCounter',
}

export enum Turn {
  AUDIO = 'play',
  PERMISSION_CARD = 'permissionCard',
  ACCOUNT_LINKING = 'accountLinking',
  END = 'end',
  PREVIOUS_OUTPUT = 'lastOutput',
  REPROMPT = 'reprompt',
  REQUEST = 'request',
  CARD = 'card',
  HANDLER_INPUT = 'handlerInput',
  TRACE = 'trace',
  DIRECTIVES = 'directives',
  NEW_STACK = 'newStack',
  DELEGATE = 'delegate',
  ELICIT_SLOT = 'elicitSlot',
}

export enum Frame {
  SPEAK = 'speak',
  CALLED_COMMAND = 'calledCommand',
}

export enum Variables {
  TIMESTAMP = 'timestamp',
  SYSTEM = '_system',
  RESPONSE = '_response',
  VOICEFLOW = 'voiceflow',
}

export default {
  Storage,
  Turn,
  Frame,
  Variables,
};
