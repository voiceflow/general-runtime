/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { EntityCache, EntityRef } from './ai-capture.types';

export const getExtractionPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
  Your goal is to extract entities from a user utterance, if the information does not follow the rules, store it as null.
  ===
  entity types:
  { "email": { type: "email" }, "role": { examples: ["admin", "editor"] } }
  rules:
  - only professional email addresses

  utterance:
  my email is john.doe@gmail.com

  result:
  { "email": null, "role": null }
  ===
  entity types:
  { "location": { type: "geography" } }
  rules:
  - only cities in the US

  utterance:
  I live in New York

  result:
  { "location": "New York" }
  ===
  entity types:
  ${JSON.stringify(entityRef)}

  rules:
  ${rules.map((rule) => `- ${rule}`).join('\n')}

  utterance:
  ${utterance}

  result:
`;

export const getRulesPrompt = (rules: string[], entityCache: EntityCache) => dedent`
  Evaluate if the captured values satisfy any of the following rules. DO NOT Mention the rules or that you are following rules, you're gathering data from a customer.
  Output 1 if the information you are provided satisfies the rules and all of the Information is not null.
  If any of the information is null or invalid, politely ask a question to get the information you need.

  Rules:
  ${rules.join('\n')}

  Information:
  ${JSON.stringify(entityCache)}

  Result:
`;

export const getExitScenerioPrompt = (
  messages: BaseUtils.ai.Message[],
  exitScenerios: string[],
  entityCache: EntityCache
) => dedent`
  Evaluate if the information satisfies any of the following exit scenarios.
  Output 0 if False, output only the number of the exit scenario if true.

  Transcript:
  ${messages.map((message) => `${message.role}: ${message.content}`).join('\n')}

  Information:
  ${JSON.stringify(entityCache)}

  Exit Scenarios:
  ${exitScenerios.map((value, index) => `${index + 1}. ${value}`).join('\n')}

  Result:
`;
