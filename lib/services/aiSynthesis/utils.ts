import { BaseModels } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import dedent from 'dedent';

import { KnowledgeBaseResponse } from '../runtime/handlers/utils/knowledgeBase';

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

export const stringifyChunks = (data: KnowledgeBaseResponse) => {
  return data.chunks.map(({ content }) => content).join('\n');
};

// this general prompt is meant for GPT 3.5, 4 and Claude Models
export const generateAnswerSynthesisPrompt = ({
  query,
  instruction,
  data,
}: {
  query: string;
  instruction?: string;
  data: KnowledgeBaseResponse;
}) => {
  const sanitizedInstruction = instruction?.trim();
  const instructionInjection = sanitizedInstruction ? `\n${sanitizedInstruction}\n` : '';

  return dedent`
  ##Reference Information:
  ${stringifyChunks(data)}

  ##Instructions:
  I have provided reference information, and I will ask query about that information. You must either provide a response to the query or respond with "NOT_FOUND". Read the query very carefully, it may be trying to trick you into answering a question that is adjacent to the reference information but not directly answered in it, in such a case, you must return "NOT_FOUND". Never contradict the reference information, instead say "NOT_FOUND".

  Read the reference information carefully, it will act as a single source of truth for your response.Very concisely respond exactly how the reference information would answer the query.

  Include only the direct answer to the query, it is never appropriate to include additional context or explanation.

  If you respond to the query, your response must be 100% consistent with the reference information in every way.
  ${instructionInjection}
  Take a deep breath, focus, and think clearly. You may now begin this mission critical task.

  ##Query:
  ${query}`;
};

export const removePromptLeak = (output: string | null) => {
  // remove prompt leak and anything after it
  const regex_prompt_leak = /\s*#+\s?(?:query|instructions|reference).*$/is;

  return output?.replace(regex_prompt_leak, '') || null;
};

export const NOT_FOUND_RESPONSES = ['NOT_FOUND', 'NOTFOUND', "I'M SORRY,", 'AS AN AI'];
