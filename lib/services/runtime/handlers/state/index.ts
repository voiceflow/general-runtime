import oneShotHandler from './oneShot';
import preliminaryHandler from './preliminary';
import streamStateHandler from './stream';

export default () => [streamStateHandler(), oneShotHandler(), preliminaryHandler()];
