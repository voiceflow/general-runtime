/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { EntityCache, EntityRef } from './ai-capture.types';

export const getExtractionPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
  Your goal is to extract entities from a user utterance, if the information does not follow the rules, store it as null.
  ###
  entity types:
  { "email": { type: "email" }, "role": { examples: ["admin", "editor"] } }
  rules:
  - only professional work email addresses

  utterance:
  my email is john.doe@gmail.com

  result:
  { "email": null, "role": null }
  ###
  entity types:
  { "location": { type: "geography" } }
  rules:
  - only cities in the US

  utterance:
  I live in New York

  result:
  { "location": "New York" }
  ###
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
  Output 'DONE' if the information you are provided satisfies the rules and all of the Information is not null.
  If any of the information is null or invalid, politely ask a question to get the information you need.

  Rules:
  ${rules.join('\n')}

  Information:
  ${JSON.stringify(entityCache)}

  Result:
`;

export const getCapturePrompt = (
  messages: BaseUtils.ai.Message[],
  rules: string[],
  exitScenerios: string[],
  entityCache: EntityCache
) => dedent`
  You're a support agent gathering data from a user, you need to politely ask questions to fill all "null" values in Entities.
  Respond in the following JSON format: { prompt?: string, exit?: number }, only set exit to an Exit Scenerio if provided.

  ###
  Rules:
  - only professional email addresses
  - address the user by name if given

  Transcript:
  user: my email is j.doe@gmail.com

  Entities:
  { "email": null, "role": "admin", "name": "John" }

  Output:
  { "prompt": "Sorry John, please provide a professional email address" }
  ###
  Rules:
  - only cities in the US

  Exit Scenarios:
  1. user provides a city in China
  2. user is frustrated

  Transcript:
  user: London, UK
  assistant: Please provide a US city
  user: how about Tokyo?
  assistant: Sorry, I can only help with US cities
  user: I was born in Beijing

  Entities:
  { "location": null }

  Output:
  { "exit": 1 }
  ###
  Rules:

  Transcript:
  assistant: Please provide your region and ticket ID
  user: europe
  assistant: What is your ticket ID for the europe region?
  user: unsure, let me check

  Entities:
  { "region": "europe", "ticketID": null }

  Output:
  { "prompt": "No worries, let me know your ticketID when you find it.", "exit": false }
  ###
  Rules:
  ${rules.map((rule) => `- ${rule}`).join('\n')}
  ${
    exitScenerios.length
      ? `\nExit Scenarios:\n${exitScenerios.map((exitScenerio, index) => `${index + 1}. ${exitScenerio}`).join('\n')}\n`
      : ''
  }

  Transcript:
  ${messages.map(({ role, content }) => `${role}: ${content}`).join('\n')}

  Entities:
  ${JSON.stringify(entityCache)}

  Output:
`;
