import eventAlexaHandler from './event/event.alexa';
import oneShotHandler from './oneShot';
import preliminaryHandler from './preliminary';
import preliminaryAlexaHandler from './preliminary/preliminary.alexa';
import streamStateHandler from './stream';
import streamStateAlexaHandler from './stream/stream.alexa';

export default () => [
  eventAlexaHandler(),
  streamStateAlexaHandler(),
  streamStateHandler(),
  oneShotHandler(),
  preliminaryAlexaHandler(),
  preliminaryHandler(),
];
