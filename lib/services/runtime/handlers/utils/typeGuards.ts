import { Node as BaseNode } from '@voiceflow/base-types';

// eslint-disable-next-line import/prefer-default-export
export const isIntentEvent = (event: BaseNode.Utils.BaseEvent): event is BaseNode.Utils.IntentEvent => {
  return 'goTo' in event;
};
