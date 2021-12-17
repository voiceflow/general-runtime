import { Node } from '@voiceflow/base-types';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

const accountSid = 'AC0402a9ad4ae782ac504bf9c779576328'
const authToken = '735a28ea215786e212299831b2bb8414';

const twilioNumber = '+14705247227';

import { Twilio } from 'twilio';
const twilioClient = new Twilio(accountSid, authToken);

export type IntegrationsOptions = {};

const TwilioHandler: HandlerFactory<Node.Integration.TwilioNode, IntegrationsOptions | void> = () => ({
  canHandle: (node) => node.type === Node.NodeType.INTEGRATIONS && node.selected_integration === Node.Utils.IntegrationType.TWILIO,
  handle: async (node, runtime) => {
    let nextId: string | null = null;

    try {
      if (!node.action_data.to_number) {
        console.log('akaka');
        throw new Error();
      }
      if (node.action_data.selected_action === Node.Twilio.TwilioActionType.CALL) {
        await twilioClient.calls.create({
          from: twilioNumber,
          to: node.action_data.to_number!,
          url: node.action_data.text_message!,
        });
        nextId = node.success_id ?? null;
      } else if (node.action_data.selected_action === Node.Twilio.TwilioActionType.TEXT) {
        await twilioClient.messages.create({
          from: twilioNumber,
          to: node.action_data.to_number!,
          body: node.action_data.text_message!
        });
        nextId = node.success_id ?? null;
      } else {
        console.log('here');
        throw new Error();
      }
    } catch (error) {
      console.log(error);
      runtime.trace.debug(`Twilio action failed - Error: \n${safeJSONStringify(error.response?.data || error)}`, Node.NodeType.TWILIO);
      nextId = node.fail_id ?? null;
    }

    return nextId;
  },
});

export default TwilioHandler;
