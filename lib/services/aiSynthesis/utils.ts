import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';

export function checkKBTagLabelsExists(tagLabelMap: Record<string, string>, tagLabels: string[]) {
  // check that KB tag labels exists, this is not atomic but it prevents a class of bugs
  const nonExistingTags = tagLabels.filter((label) => !tagLabelMap[label]);

  if (nonExistingTags.length > 0) {
    const formattedTags = nonExistingTags.map((tag) => `\`${tag}\``).join(', ');
    throw new VError(`tags with the following labels do not exist: ${formattedTags}`, VError.HTTP_STATUS.NOT_FOUND);
  }
}

export function convertTagsFilterToIDs(
  tags: BaseModels.Project.KnowledgeBaseTagsFilter,
  tagLabelMap: Record<string, string>
): BaseModels.Project.KnowledgeBaseTagsFilter {
  const result = tags;
  const includeTagsArray = result?.include?.items ?? [];
  const excludeTagsArray = result?.exclude?.items ?? [];

  if (includeTagsArray.length > 0 || excludeTagsArray.length > 0) {
    checkKBTagLabelsExists(tagLabelMap, Array.from(new Set([...includeTagsArray, ...excludeTagsArray])));
  }

  if (result?.include?.items) {
    result.include.items = result.include.items
      .filter((label) => tagLabelMap[label] !== undefined)
      .map((label) => tagLabelMap[label]);
  }

  if (result?.exclude?.items) {
    result.exclude.items = result.exclude.items
      .filter((label) => tagLabelMap[label] !== undefined)
      .map((label) => tagLabelMap[label]);
  }

  return result;
}

export function generateTagLabelMap(existingTags: Record<string, BaseModels.Project.KBTag>): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(existingTags).forEach(([tagID, tag]) => {
    result[tag.label] = tagID;
  });

  return result;
}
