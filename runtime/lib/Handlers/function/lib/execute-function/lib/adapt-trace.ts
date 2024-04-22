import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { Utils } from '@voiceflow/common';

import {
  SimpleAction,
  SimpleActionButton,
  SimpleActionButtonDTO,
} from '../../../runtime-command/button/action-button.dto';
import { SimpleGeneralButton, SimpleGeneralButtonDTO } from '../../../runtime-command/button/general-button.dto';
import { SimpleCard } from '../../../runtime-command/card/card.dto';
import { SimpleAudioTrace } from '../../../runtime-command/trace/audio.dto';
import { UnknownTrace } from '../../../runtime-command/trace/base.dto';
import { SimpleCardV2Trace } from '../../../runtime-command/trace/cardV2.dto';
import { SimpleCarouselTrace } from '../../../runtime-command/trace/carousel.dto';
import { SimpleTraceType } from '../../../runtime-command/trace/simple-trace-type.enum';
import { SimpleSpeakTrace } from '../../../runtime-command/trace/speak.dto';
import { SimpleTextTrace } from '../../../runtime-command/trace/text.dto';
import { SimpleVisualTrace } from '../../../runtime-command/trace/visual.dto';
import { isSimpleTrace } from './is-simple-trace';

const { cuid } = Utils.id;
const { TraceType } = BaseTrace;

const adaptTextTrace = (trace: SimpleTextTrace): UnknownTrace => {
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

const adaptSpeakTrace = (trace: SimpleSpeakTrace): UnknownTrace => {
  return {
    ...trace,
    type: TraceType.SPEAK,
    payload: {
      ...trace.payload,
      type: BaseNode.Speak.TraceSpeakType.MESSAGE,
    },
  } satisfies BaseTrace.SpeakTrace;
};

const adaptAudioTrace = (trace: SimpleAudioTrace): UnknownTrace => {
  return {
    ...trace,
    type: TraceType.SPEAK,
    payload: {
      type: BaseNode.Speak.TraceSpeakType.AUDIO,
      message: `<audio src='${trace.payload.src ?? ''}'/>`,
    },
  } satisfies BaseTrace.SpeakTrace;
};

const adaptVisualTrace = (trace: SimpleVisualTrace): UnknownTrace => {
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

const adaptButton = (
  button: SimpleActionButton | SimpleGeneralButton
): BaseRequest.ActionRequestButton | BaseRequest.GeneralRequestButton => {
  const parsedActionButton = SimpleActionButtonDTO.safeParse(button);
  if (parsedActionButton.success) {
    return adaptActionButton(parsedActionButton.data);
  }

  const parsedGeneralButton = SimpleGeneralButtonDTO.safeParse(button);
  if (parsedGeneralButton.success) {
    // !TODO! - Need to add an empty payload object `{}` because the old button type in
    //          `base-types` requires that `payload` is defined, but the new button type
    //          in `dtos` makes `payload` optional so it's missing when we need it. Need to
    //          port all code over to the `dtos` package and unify the types across
    //          `general-runtime` and `creator-app`.
    return {
      ...parsedGeneralButton.data,
      request: {
        payload: {},
        ...parsedGeneralButton.data.request,
      },
    };
  }

  throw new TypeError('received unexpected button type');
};

const adaptCard = (card: SimpleCard): BaseNode.Carousel.TraceCarouselCard => {
  return {
    ...card,
    id: cuid.slug(),
    buttons: (card.buttons ?? []).map((but) => adaptButton(but)),
  };
};

const adaptCarouselTrace = (trace: SimpleCarouselTrace): UnknownTrace => {
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

const adaptCardV2Trace = (trace: SimpleCardV2Trace): UnknownTrace => {
  return {
    ...trace,
    type: TraceType.CARD_V2,
    payload: {
      ...trace.payload,
      buttons: (trace.payload.buttons ?? []).map((but) => adaptButton(but)),
    },
  } satisfies BaseTrace.CardV2;
};

export function adaptTrace(trace: UnknownTrace): UnknownTrace {
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
    default:
      return trace;
  }
}
