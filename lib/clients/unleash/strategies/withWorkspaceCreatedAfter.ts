import { isAfter, isValid } from 'date-fns';
import { Strategy } from 'unleash-client';
import { Context } from 'unleash-client/lib/context';

class WithWorkspaceCreatedAfterStrategy extends Strategy {
  constructor() {
    super('withWorkspaceCreatedAfter');
  }

  isEnabled(
    parameters: { workspaceCreatedAfter: string },
    { workspaceCreatedAt }: Context & { workspaceCreatedAt?: string | Date }
  ): boolean {
    const workspaceCreatedAtDate = workspaceCreatedAt ? new Date(workspaceCreatedAt) : null;
    const workspaceCreatedAfterDate = parameters.workspaceCreatedAfter
      ? new Date(parameters.workspaceCreatedAfter)
      : null;

    return (
      !!workspaceCreatedAtDate &&
      !!workspaceCreatedAfterDate &&
      isValid(workspaceCreatedAtDate) &&
      isValid(workspaceCreatedAfterDate) &&
      isAfter(workspaceCreatedAtDate, workspaceCreatedAfterDate)
    );
  }
}

export default WithWorkspaceCreatedAfterStrategy;
