import { BaseTrace } from '@voiceflow/base-types';
import { isGeneralRequest } from '@voiceflow/base-types/build/cjs/request';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { replaceVariables } from '@voiceflow/common';
import {
  FunctionCompiledDefinition,
  FunctionCompiledInvocation,
  FunctionCompiledNode,
  NodeType,
} from '@voiceflow/dtos';
import { NotImplementedException } from '@voiceflow/exception';
import { isIntentRequest, isTextRequest } from '@voiceflow/utils-designer';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _ from 'lodash';
import lodashModifier from 'underscore-query';

import { HandlerFactory } from '@/runtime/lib/Handler';

import Runtime from '../../Runtime';
import Store from '../../Runtime/Store';
import { EventType, FunctionRequestContext } from './lib/event/event.types';
import { executeFunction } from './lib/execute-function/execute-function';
import { fromFunctionGeneralButtonName } from './lib/execute-function/lib/adapt-trace';
import { createFunctionExceptionDebugTrace } from './lib/function-exception/function.exception';
import { NextBranches, NextBranchesDTO, NextCommand } from './runtime-command/next-command.dto';
import { OutputVarsCommand } from './runtime-command/output-vars-command.dto';
import { TraceCommand } from './runtime-command/trace-command.dto';
import { Transfer, TransferType } from './runtime-command/transfer/transfer.dto';

lodashModifier(_);

const utilsObj = {
  replaceVariables,
};

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  {
    variables,
    outputVarDeclarations,
    outputVarAssignments,
  }: {
    variables: Store;
    outputVarDeclarations: FunctionCompiledDefinition['outputVars'];
    outputVarAssignments: FunctionCompiledInvocation['outputVars'];
  }
): void {
  Object.keys(outputVarDeclarations).forEach((functionVarName) => {
    const diagramVariableName = outputVarAssignments[functionVarName];
    if (!diagramVariableName) return;
    variables.set(diagramVariableName, command[functionVarName]);
    runtime.variables.set(diagramVariableName, command[functionVarName]);
  });
}

function applyTraceCommand(command: TraceCommand, runtime: Runtime): void {
  command.forEach((trace) => {
    // !TODO! - Revamp `general-runtime` types to allow users to modify the built-in
    //          trace types and avoid this `as` cast.
    runtime.trace.addTrace(trace as BaseTraceFrame);
  });
}

function applyNextCommand(
  command: NextCommand,
  runtime: Runtime,
  { nodeId, paths }: { nodeId: string; paths: FunctionCompiledInvocation['paths'] }
): string | null {
  if ('listen' in command) {
    if (!command.listen) return null;

    const { defaultTo, to } = command;
    runtime.variables.set(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS, { defaultTo, to });

    return nodeId;
  }
  if ('path' in command) {
    return paths[command.path] ?? null;
  }
  return null;
}

function applyTransfer(transfer: string | Transfer, paths: FunctionCompiledInvocation['paths']) {
  // Case 1 - `transfer` is a path string that must be mapped
  if (typeof transfer === 'string') {
    return paths[transfer];
  }

  // Case 2 - `transfer` is a Transfer object that can be anything such as a PathTransfer
  if (transfer.type === TransferType.PATH) {
    return paths[transfer.path];
  }

  throw new Error(`Function produced a transfer object with an unexpected type '${transfer.type}'`);
}

function handleListenResponse(
  conditionalTransfers: NextBranches,
  requestContext: FunctionRequestContext,
  paths: FunctionCompiledInvocation['paths']
): string {
  // !TODO! - Remove the `any` cast here
  const firstMatchingTransfer = conditionalTransfers.to.find(
    (item) => (_ as any).query([requestContext], item.on).length > 0
  );

  if (!firstMatchingTransfer) {
    return applyTransfer(conditionalTransfers.defaultTo, paths);
  }

  return applyTransfer(firstMatchingTransfer.dest, paths);
}

function createFunctionRequestContext(runtime: Runtime): FunctionRequestContext {
  const request = runtime.getRequest();

  if (isIntentRequest(request)) {
    const {
      intent: { name },
      confidence,
      entities = [],
      query,
    } = request.payload;

    return {
      event: {
        type: EventType.INTENT,
        name,
        confidence,
        entities: Object.fromEntries(entities.map((ent) => [ent.name, { name: ent.name, value: ent.value }])),
        utterance: query,
      },
    };
  }

  if (isGeneralRequest(request)) {
    return {
      event: {
        type: EventType.GENERAL,
        name: fromFunctionGeneralButtonName(request.type),
      },
    };
  }

  if (isTextRequest(request)) {
    return {
      event: {
        type: EventType.TEXT,
        value: request.payload,
      },
    };
  }

  throw new NotImplementedException('Function received an unexpected request type');
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { definition, invocation } = node.data;

    try {
      const parsedTransfers = NextBranchesDTO.safeParse(
        runtime.variables.get(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS)
      );

      /**
       * Case 1 - If there is a `parsedTransfers`, then we are resuming Function step execution after
       *          obtaining user input
       */
      if (parsedTransfers.success) {
        const conditionalTransfers = parsedTransfers.data;
        const requestContext = createFunctionRequestContext(runtime);

        const nextId = handleListenResponse(conditionalTransfers, requestContext, invocation.paths);

        runtime.variables.set(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS, null);

        return nextId;
      }

      /**
       * Case 2 - If there are no `parsedTransfers`, then we are hitting this Function step for the
       *          first time
       */
      const resolvedInputMapping = Object.entries(invocation.inputVars).reduce((acc, [varName, value]) => {
        return {
          ...acc,
          [varName]: utils.replaceVariables(value, variables.getState()),
        };
      }, {});

      const { next, outputVars, trace } = await executeFunction({
        ...node.data,
        source: {
          codeId: definition.codeId,
        },
        invocation: {
          inputVars: resolvedInputMapping,
        },
      });

      if (outputVars) {
        applyOutputCommand(outputVars, runtime, {
          variables,
          outputVarDeclarations: definition.outputVars,
          outputVarAssignments: invocation.outputVars,
        });
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
      }

      if (definition.pathCodes.length === 0) {
        return invocation.paths.__vf__default ?? null;
      }
      if (next) {
        return applyNextCommand(next, runtime, { nodeId: node.id, paths: invocation.paths });
      }
      return null;
    } catch (err) {
      // !TODO! - Revamp `general-runtime` types to allow users to modify the built-in
      //          trace types and avoid this `as` cast.
      runtime.trace.addTrace(createFunctionExceptionDebugTrace(err) as BaseTrace.DebugTrace);

      return null;
    }
  },
});

export default () => FunctionHandler(utilsObj);
