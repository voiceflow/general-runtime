/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { EntityCache, EntityRef } from './ai-capture.types';

export const getExtractionPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
You're a support agent interacting with user.
You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entities.
You will also be provided a set of rules (guidelines) to assess the entity and certain cases (exit scenarios) that indicate when the conversation should end.
Your task is to extract the entity from the user statement and assess whether the rules are fulfilled.
The output should include the entity state, the type of decision made (fulfilled, reprompt, or exit scenario),
the rationale behind the decision, and the response to the user.
If the entity does not fulfill the rules, your response should contain a reprompt politely asking for valid entity details.
If the entity fulfills the rules or an exit scenario is met, you should end the conversation.
Always try to use previous context to make the conversation more engaging and relevant.

Output should contain the following fields: 
rationale: string, 
type: number,
entity_state: dict,
response: string

  ###
  Rules:
    - only professional email addresses
    - address the user by name if given

  Transcript:
    user_statement: my email is j.doe@gmail.com

  Output:
    response: "Sorry John, please provide a professional email address" ,
    rationale: "The user provided a non-professional email address, so we asked for a professional one by addressing the user by name",
    entity_state:{ "email": null, "role": "admin", "name": "John" }
    type: reprompt

  ###
  Rules:
    - only cities in the US

  Exit Scenarios:
    1. user provides a city in China
    2. user is frustrated

  Transcript:
    user_statement: London, UK
    assistant: Please provide a US city
    user_statement: how about Tokyo?
    assistant: Sorry, I can only help with US cities
    user_statement: I was born in Beijing
          
  Output:
    response: "" ,
    rationale: "The user provided a city in China, so we asked for a US city. The user then mentioned a city in Japan, so we asked for a US city again. The user then mentioned a city in China, so we ended the conversation."",
    entity_state:{ "location": null }
    type: exit1
  ###
  Rules:
  exit_scenarios: 
  Transcript:
    assistant: Please provide your region and ticket ID
    user_statement: europe
    assistant: What is your ticket ID for the europe region?
    user_statement: unsure, let me check
          
  Output:
    entity_state:{ "region": "europe", "ticketID": null }
    response:"No worries, let me know your ticketID when you find it."
    "type": reprompt
  ###

  rules:
  ${rules.map((rule) => `- ${rule}`).join('\n')}

  user_statement:
  ${utterance}
  
  example_entities:
  ${JSON.stringify(entityRef)}

  Output:
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
You're a support agent interacting with user.
You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entities.
You will also be provided a set of rules (guidelines) to assess the entity and certain cases (exit scenarios) that indicate when the conversation should end.
Your task is to extract the entity from the user statement and assess whether the rules are fulfilled.
The output should include the entity state, the type of decision made (fulfilled, reprompt, or exit scenario),
the rationale behind the decision, and the response to the user.
If the entity does not fulfill the rules, your response should contain a reprompt politely asking for valid entity details.
If the entity fulfills the rules or an exit scenario is met, you should end the conversation.
Always try to use previous context to make the conversation more engaging and relevant.

Output should contain the following fields: 
rationale: string, 
type: number,
entity_state: dict,
response: string

  ###
  Rules:
    - only professional email addresses
    - address the user by name if given

  Transcript:
    user_statement: my email is j.doe@gmail.com

  Output:
    response: "Sorry John, please provide a professional email address" ,
    rationale: "The user provided a non-professional email address, so we asked for a professional one by addressing the user by name",
    entity_state:{ "email": null, "role": "admin", "name": "John" }
    type: reprompt

  ###
  Rules:
    - only cities in the US

  Exit Scenarios:
    1. user provides a city in China
    2. user is frustrated

  Transcript:
    user_statement: London, UK
    assistant: Please provide a US city
    user_statement: how about Tokyo?
    assistant: Sorry, I can only help with US cities
    user_statement: I was born in Beijing
          
  Output:
    response: "" ,
    rationale: "The user provided a city in China, so we asked for a US city. The user then mentioned a city in Japan, so we asked for a US city again. The user then mentioned a city in China, so we ended the conversation."",
    entity_state:{ "location": null }
    type: exit1
  ###
  Rules:
  exit_scenarios: 
  Transcript:
    assistant: Please provide your region and ticket ID
    user_statement: europe
    assistant: What is your ticket ID for the europe region?
    user_statement: unsure, let me check
          
  Output:
    entity_state:{ "region": "europe", "ticketID": null }
    response:"No worries, let me know your ticketID when you find it."
    "type": reprompt
  ###
  Rules:
  ${rules.map((rule) => `- ${rule}`).join('\n')}
  exitScenerios:
  ${
    exitScenerios.length
      ? `\nExit Scenarios:\n${exitScenerios.map((exitScenerio, index) => `${index + 1}. ${exitScenerio}`).join('\n')}\n`
      : ''
  }

  Transcript:
  ${messages.map(({ role, content }) => `${role}: ${content}`).join('\n')}

  entity_state:
  ${JSON.stringify(entityCache)}

  Output:
`;
