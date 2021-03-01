import oneShotHandler from './oneShot';
import streamStateHandler from './stream';

export default () => [streamStateHandler(), oneShotHandler()];
