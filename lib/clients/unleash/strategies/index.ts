import { Strategy } from 'unleash-client';

import NotWithWorkspaceIdStrategy from './notWithWorkspaceId';
import WithOrganizationIdStrategy from './withOrganizationId';
import WithWorkspaceCreatedAfter from './withWorkspaceCreatedAfter';
import WithWorkspaceIdStrategy from './withWorkspaceId';

const strategies: Strategy[] = [
  new WithOrganizationIdStrategy(),
  new WithWorkspaceIdStrategy(),
  new NotWithWorkspaceIdStrategy(),
  new WithWorkspaceCreatedAfter(),
];

export default strategies;
