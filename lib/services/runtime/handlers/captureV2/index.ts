import CaptureV2GeneralHandler from './captureV2';
import CaptureV2AlexaHandler from './captureV2.alexa';

export default () => [CaptureV2AlexaHandler(), CaptureV2GeneralHandler()];
