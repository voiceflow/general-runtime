import log from '@/logger';

export function FunctionRunner(functionID: string, inputMapping: Record<string, unknown>) {
  log.warn(`TestService.testFunction was called but is not implemented`);
  log.info(`Retrieving function associated with functionID=${functionID}`);
  log.info(`Using inputMapping = ${inputMapping}`);
}
