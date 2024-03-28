import { Trace } from '../../../runtime-command/trace/base.dto';
import { SimpleTraceType } from '../../../runtime-command/trace/simple-trace-type.enum';
import { SimpleTrace, SimpleTraceDTO } from '../../../runtime-command/trace-command.dto';

export const isSimpleTrace = (trace: Trace): trace is SimpleTrace => SimpleTraceDTO.safeParse(trace).success;

const simpleTraceTypes = new Set<string>(Object.values(SimpleTraceType));

export const isSimpleTraceType = (traceType: string): traceType is SimpleTraceType => simpleTraceTypes.has(traceType);
