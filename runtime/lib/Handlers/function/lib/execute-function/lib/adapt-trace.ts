import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';

import {
  SimpleAction,
  SimpleActionButton,
  SimpleAudioTrace,
  SimpleCard,
  SimpleCardV2Trace,
  SimpleCarouselTrace,
  SimpleChoiceTrace,
  SimpleGeneralButton,
  SimpleSpeakTrace,
  SimpleTextTrace,
  SimpleTraceType,
  SimpleVisualTrace,
  Trace,
} from '../../../runtime-command/trace-command.dto';
import { isSimpleTrace } from './is-simple-trace';

const { cuid } = Utils.id;
const { TraceType } = BaseTrace;

const adaptTextTrace = (trace: SimpleTextTrace): Trace => {
  return {
    ...trace,
    type: TraceType.TEXT,
    payload: {
      slate: {
        id: 'dummy',
        content: [{ children: [{ text: trace.payload.message }] }],
      },
      ...trace.payload,
    },
  } satisfies BaseTrace.TextTrace;
};

const adaptSpeakTrace = (trace: SimpleSpeakTrace): Trace => {
  return {
    ...trace,
    type: TraceType.SPEAK,
    payload: {
      ...trace.payload,
      type: BaseNode.Speak.TraceSpeakType.MESSAGE,
    },
  } satisfies BaseTrace.SpeakTrace;
};

const adaptAudioTrace = (trace: SimpleAudioTrace): Trace => {
  return {
    ...trace,
    type: TraceType.SPEAK,
    payload: {
      type: BaseNode.Speak.TraceSpeakType.AUDIO,
      message: `<audio src='${trace.payload.src ?? ''}'/>`,
    },
  } satisfies BaseTrace.SpeakTrace;
};

const adaptVisualTrace = (trace: SimpleVisualTrace): Trace => {
  return {
    ...trace,
    type: TraceType.VISUAL,
    payload: {
      visualType: BaseNode.Visual.VisualType.IMAGE,
      device: BaseNode.Visual.DeviceType.DESKTOP,
      dimensions: {
        width: 480,
        height: 360,
      },
      canvasVisibility: BaseNode.Visual.CanvasVisibility.FULL,
      ...trace.payload,
    },
  } satisfies BaseTrace.VisualTrace;
};

const adaptAction = (action: SimpleAction): BaseRequest.Action.BaseAction => {
  if (action.type !== BaseRequest.Action.ActionType.OPEN_URL) {
    throw new Error(`received unexpected action type`);
  }

  const { type, ...payload } = action;

  return {
    type,
    payload,
  };
};

const adaptActionButton = (button: SimpleActionButton): BaseRequest.ActionRequestButton => {
  return {
    name: button.name,
    request: {
      type: BaseRequest.RequestType.ACTION,
      payload: {
        label: button.name,
        actions: button.payload.actions.map((act) => adaptAction(act)),
      },
    },
  };
};

const toFunctionGeneralButtonName = (name: string) => {
  const buttonName = `function-button:${name}`;
  if (!isFunctionGeneralButtonName(buttonName)) {
    throw new Error('invalud button name');
  }
  return buttonName;
};

const isFunctionGeneralButtonName = (name: string) => /^function-button:[A-Z_a-z][\dA-Za-z]*$/.test(name);

const adaptGeneralButton = (button: SimpleGeneralButton): BaseRequest.GeneralRequestButton => {
  return {
    name: button.name,
    request: {
      type: toFunctionGeneralButtonName(button.payload.code),
      payload: {
        label: button.name,
      },
    },
  };
};

const adaptCard = (card: SimpleCard): BaseNode.Carousel.TraceCarouselCard => {
  return {
    ...card,
    id: cuid.slug(),
    buttons: (card.buttons ?? []).map((but) => adaptActionButton(but)),
  };
};

const adaptCarouselTrace = (trace: SimpleCarouselTrace): Trace => {
  return {
    ...trace,
    type: TraceType.CAROUSEL,
    payload: {
      layout: BaseNode.Carousel.CarouselLayout.CAROUSEL,
      ...trace.payload,
      cards: trace.payload.cards.map((item) => adaptCard(item)),
    },
  } satisfies BaseTrace.CarouselTrace;
};

const adaptCardV2Trace = (trace: SimpleCardV2Trace): Trace => {
  return {
    ...trace,
    type: TraceType.CARD_V2,
    payload: {
      ...trace.payload,
      buttons: (trace.payload.buttons ?? []).map((but) => adaptActionButton(but)),
    },
  } satisfies BaseTrace.CardV2;
};

const adaptChoiceTrace = (trace: SimpleChoiceTrace): Trace => {
  return {
    ...trace,
    type: TraceType.CHOICE,
    payload: {
      ...trace.payload,
      buttons: (trace.payload.buttons ?? []).map((but) => adaptGeneralButton(but)),
    },
  } satisfies BaseTrace.Choice;
};

export function adaptTrace(trace: Trace): Trace {
  if (!isSimpleTrace(trace)) return trace;

  switch (trace.type) {
    case SimpleTraceType.Text:
      return adaptTextTrace(trace);
    case SimpleTraceType.Speak:
      return adaptSpeakTrace(trace);
    case SimpleTraceType.Audio:
      return adaptAudioTrace(trace);
    case SimpleTraceType.Visual:
      return adaptVisualTrace(trace);
    case SimpleTraceType.Carousel:
      return adaptCarouselTrace(trace);
    case SimpleTraceType.CardV2:
      return adaptCardV2Trace(trace);
    case SimpleTraceType.Choice:
      return adaptChoiceTrace(trace);
    default:
      return trace;
  }
}
