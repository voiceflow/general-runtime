import { BlockTraceFrame, StateRequest, TraceType as GeneralTraceType, TraceType } from '@voiceflow/general-types';
import { TraceFrame as ExitTraceFrame } from '@voiceflow/general-types/build/nodes/exit';
import { TraceFrame as FlowTraceFrame } from '@voiceflow/general-types/build/nodes/flow';
import { TraceFrame as SpeakTraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import Client, { EventType, State } from '@voiceflow/runtime';

import { FullServiceMap } from '../index';
import { AbstractManager, Config, injectServices } from '../utils';
import Handlers from './handlers';
import { RESUME_PROGRAM_ID, ResumeDiagram } from './programs/resume';
import { FrameType, SpeakFrame, StorageData, StorageType, TEST_VERSION_ID, TurnType, Variables } from './types';

export const utils = {
  Client,
  resume: {
    ResumeDiagram,
    RESUME_PROGRAM_ID,
  },
  Handlers,
};

@injectServices({ utils })
class RuntimeManager extends AbstractManager<{ utils: typeof utils }> {
  private client: Client;

  private handlers: ReturnType<typeof Handlers>;

  constructor(services: FullServiceMap, config: Config) {
    super(services, config);

    this.handlers = this.services.utils.Handlers(config);

    this.client = new this.services.utils.Client({
      api: services.dataAPI,
      services,
      handlers: this.handlers,
    });

    this.setup();
  }

  private setup() {
    this.client.setEvent(EventType.stackDidChange, ({ context }) => {
      const programID = context.stack.top()?.getProgramID();

      context.trace.addTrace<FlowTraceFrame>({
        type: TraceType.FLOW,
        payload: { diagramID: programID },
      });
    });

    this.client.setEvent(EventType.frameDidFinish, ({ context }) => {
      if (context.stack.top()?.storage.get(FrameType.CALLED_COMMAND)) {
        context.stack.top().storage.delete(FrameType.CALLED_COMMAND);

        const output = context.stack.top().storage.get<SpeakFrame>(FrameType.SPEAK);

        if (output) {
          context.storage.produce<StorageData>((draft) => {
            draft[StorageType.OUTPUT] += output;
          });

          context.trace.addTrace<SpeakTraceFrame>({ type: TraceType.SPEAK, payload: { message: output } });
        }
      }
    });

    this.client.setEvent(EventType.programWillFetch, ({ programID, override }) => {
      if (programID === this.services.utils.resume.RESUME_PROGRAM_ID) {
        override(this.services.utils.resume.ResumeDiagram);
      }
    });
  }

  public async invoke(state: State, request?: StateRequest) {
    const context = this.client.createContext(TEST_VERSION_ID, state, request, {
      api: this.services.dataAPI,
      handlers: this.handlers,
    });

    context.setEvent(EventType.handlerWillHandle, (event) =>
      context.trace.addTrace<BlockTraceFrame>({ type: GeneralTraceType.BLOCK, payload: { blockID: event.node.id } })
    );

    context.turn.set(TurnType.REQUEST, request);
    context.variables.set(Variables.TIMESTAMP, Math.floor(Date.now() / 1000));

    context.turn.set(TurnType.PREVIOUS_OUTPUT, context.storage.get(StorageType.OUTPUT));
    context.storage.set(StorageType.OUTPUT, '');

    await context.update();

    if (context.stack.isEmpty() && !context.turn.get(TurnType.END)) {
      context.trace.addTrace<ExitTraceFrame>({ type: GeneralTraceType.END });
    }

    return {
      ...context.getRawState(),
      trace: context.trace.get(),
    };
  }
}

export default RuntimeManager;
