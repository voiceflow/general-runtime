import CardV2GeneralHandler from './cardV2';
import CardV2AlexaHandler from './cardV2.alexa';

export default () => [CardV2AlexaHandler(), CardV2GeneralHandler()];
