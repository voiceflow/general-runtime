import CarousselGeneralHandler from './carousel';
import CarousselAlexaHandler from './carousel.alexa';
import CarousselGoogleHandler from './carousel.google';

export default () => [CarousselGoogleHandler(), CarousselAlexaHandler(), CarousselGeneralHandler()];
