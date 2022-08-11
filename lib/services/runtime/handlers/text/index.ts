import TextGeneralHandler from './text';
import TextGoogleHandler from './text.google';

export default () => [TextGoogleHandler(), TextGeneralHandler()];
