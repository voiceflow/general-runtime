import { BaseModels } from '@voiceflow/base-types';

import log from '@/logger';

import { AbstractManager } from '../utils';

export class TestService extends AbstractManager {
  async tagNamesToObjectIds(
    tags: string[],
    existingTags?: Record<string, BaseModels.Project.KBTag>
  ): Promise<Set<string>> {
    const tagIds = new Set<string>();

    if (!existingTags) {
      return tagIds;
    }

    Object.keys(existingTags)
      .filter((tagID) => tags.includes(existingTags[tagID].label))
      .forEach((tag) => tagIds.add(tag));

    return tagIds;
  }

  public async testFunction(functionID: string, inputMapping: Record<string, unknown>) {
    log.warn(`TestService.testFunction was called but is not implemented`);
    log.info(`Retrieving function associated with functionID=${functionID}`);
    log.info(`Using inputMapping = ${inputMapping}`);
  }
}
