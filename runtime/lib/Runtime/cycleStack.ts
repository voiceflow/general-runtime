import { S } from '@/runtime/lib/Constants';
import { EventType } from '@/runtime/lib/Lifecycle';
import Runtime from '@/runtime/lib/Runtime';

import cycleHandler from './cycleHandler';
import { createCombinedVariables, mapStores, saveCombinedVariables } from './utils/variables';
import { HandleContextEvent } from '../Context/types';

const STACK_OVERFLOW = 60;

const cycleStack = async (runtime: Runtime, event: HandleContextEvent, depth = 0): Promise<void> => {
  if (runtime.stack.getSize() === 0 || depth > STACK_OVERFLOW) {
    runtime.end();
    return;
  }

  if (runtime.stack.top()?.getDiagramID() === runtime.getVersionID()) {
    runtime.stack.flush();
    runtime.end();
    return;
  }

  const currentFrame = runtime.stack.top();
  const currentFrames = runtime.stack.getFrames();

  const program = await runtime.getProgram(runtime.getVersionID(), currentFrame.getDiagramID());

  // hydrate frame with program properties
  currentFrame.hydrate(program);

  // generate combined variable state (global/local)
  const combinedVariables = createCombinedVariables(runtime.variables, currentFrame.variables);

  try {
    await runtime.callEvent(EventType.stateWillExecute, { program, variables: combinedVariables });
    await cycleHandler(runtime, program, combinedVariables, event);
    await runtime.callEvent(EventType.stateDidExecute, { program, variables: combinedVariables });
  } catch (error) {
    await runtime.callEvent(EventType.stateDidCatch, { error });
  }

  // deconstruct variable state and save to stores
  saveCombinedVariables(combinedVariables, runtime.variables, currentFrame.variables);

  // Action.END allows you to stay on the same frame and return a response
  if (runtime.hasEnded()) {
    return;
  }

  if (currentFrames === runtime.stack.getFrames()) {
    // pop frame
    const poppedFrame = runtime.stack.pop();
    await runtime.callEvent(EventType.frameDidFinish, { frame: poppedFrame });

    const topFrame = runtime.stack.top();

    if (poppedFrame?.storage.get(S.OUTPUT_MAP) && topFrame) {
      mapStores(poppedFrame.storage.get<[string, string][]>(S.OUTPUT_MAP)!, combinedVariables, topFrame.variables);
    }
  }

  await cycleStack(runtime, event, depth + 1);
};

export default cycleStack;
