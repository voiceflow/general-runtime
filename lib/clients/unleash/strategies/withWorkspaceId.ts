import { Strategy } from 'unleash-client';
import { Context } from 'unleash-client/lib/context';

class WithWorkspaceId extends Strategy {
  constructor() {
    super('withWorkspaceId');
  }

  isEnabled(parameters: { workspaceIds: string }, { workspaceId }: Context & { workspaceId?: number }): boolean {
    // regexp copied from the default userWithId strategy
    const workspaceIds = parameters.workspaceIds.split(/\s*,\s*/);

    return !!workspaceId && workspaceIds.includes(String(workspaceId));
  }
}

export default WithWorkspaceId;
