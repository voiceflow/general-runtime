import { Context, Strategy } from 'unleash-client';

class NotWithWorkspaceId extends Strategy {
  constructor() {
    super('notWithWorkspaceId');
  }

  isEnabled(parameters: { workspaceIds: string }, { workspaceId }: Context & { workspaceId?: number }): boolean {
    // regexp copied from the default userWithId strategy
    const workspaceIds = parameters.workspaceIds.split(/\s*,\s*/);

    return !!workspaceId && !workspaceIds.includes(String(workspaceId));
  }
}

export default NotWithWorkspaceId;
