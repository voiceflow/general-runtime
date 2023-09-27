import { Strategy } from 'unleash-client';
import { Context } from 'unleash-client/lib/context';

class WithOrganizationId extends Strategy {
  constructor() {
    super('withOrganizationId');
  }

  isEnabled(
    parameters: { organizationIds: string },
    { organizationId }: Context & { organizationId?: number }
  ): boolean {
    // regexp copied from the default userWithId strategy
    const organizationIds = parameters.organizationIds.split(/\s*,\s*/);

    return !!organizationId && organizationIds.includes(String(organizationId));
  }
}

export default WithOrganizationId;
