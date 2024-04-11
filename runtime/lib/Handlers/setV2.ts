import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime/lib/Handler';

import CodeHandler, { GENERATED_CODE_NODE_ID } from './code';

export type SetV2Options = Record<string, never>;

const SetV2Handler: HandlerFactory<BaseNode.SetV2.Node, SetV2Options | void> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.SET_V2,
  handle: async (node, runtime, variables, program) => {
    // use isolated-vm
    const codeHandler = CodeHandler();

    const beforeValues: Map<string, any> = new Map();

    const codeLines = [`let evaluated;`];
    node.sets.forEach((set) => {
      if (!set.variable) return;
      if (!variables.has(set.variable)) {
        runtime.variables.set(set.variable, 0);
        variables.set(set.variable, 0);
      }

      beforeValues.set(set.variable, variables.get(set.variable));

      codeLines.push(
        `evaluated = eval(\`${set.expression}\`);`,
        `${set.variable} = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;`
      );
    });

    await codeHandler.handle(
      { code: codeLines.join('\n'), id: GENERATED_CODE_NODE_ID, type: BaseNode.NodeType.CODE },
      runtime,
      variables,
      program
    );

    runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.SET, node, {
      changedVariables: Object.fromEntries(
        [...beforeValues].map(([variable, beforeValue]) => [
          variable,
          { before: beforeValue, after: variables.get(variable) ?? null },
        ])
      ),
    });

    return node.nextId || null;
  },
});

export default SetV2Handler;
