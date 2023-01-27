import InteractionGeneralHandler from './interaction';
import InteractionAlexaHandler from './interaction.alexa';

export default () => [InteractionAlexaHandler(), InteractionGeneralHandler()];
