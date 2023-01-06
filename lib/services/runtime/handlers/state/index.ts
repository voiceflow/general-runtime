import oneShotHandler from './oneShot';
import preliminaryHandler from './preliminary';
import preliminaryAlexaHandler from './preliminary/preliminary.alexa';
import streamStateHandler from './stream';
import streamStateAlexaHandler from './stream/stream.alexa';

export default () => [
  streamStateAlexaHandler(),
  streamStateHandler(),
  oneShotHandler(),
  preliminaryAlexaHandler(),
  preliminaryHandler(),
];
