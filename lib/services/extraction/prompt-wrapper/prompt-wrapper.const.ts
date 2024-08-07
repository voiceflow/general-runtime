import dedent from 'dedent';

import { PromptWrapperSlotMap } from './prompt-wrapper.interface';

export const getEntityProcessingSystemPrompt = (
  utterance: string,
  prev_user_statements: string[],
  prev_responses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: PromptWrapperSlotMap
) => dedent`
  You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entity.
  You will also be provided a set of rules (guidelines) to understand the entity to be provided in response to the user statement or assess the user provided entity.
  You will also provided with exit scenarios that indicate the scenarios when the conversation should end.
  Provide the entity_state in the following format that can be converted to dictionary object : {entity_name: entity_value}.
  Generate the values for entity state depending on the user statement, Prev User Statements or response provided.
  The value for type should be set to 'fulfilled' only if the entities captured fulfills all the rules.
  Strictly provide the following fields in output :  Type, Entity State, Response, Rationale
  ###

  Follow the following format.

  User Statement: ${utterance}

  Prev User Statements: ${prev_user_statements}

  Prev Responses: ${prev_responses}

  Rules: ${rules.join('\n')}

  Exit Scenarios: ${exitScenerios.join('\n')}

  Example Entities: ${entityRef}

  Rationale: Reasoning about entity that is either to be provided to user's question and next action of providing valid response or reasoning about valid entity that needs to be captured from user statement and next action of requesting user to provide valid information

  Type: Type indicating whether extracted entities 'fulfilled' all the rules defined or a 'reprompt' is required or exit scenario is met.

  Entity State: Dictionary representation of entity name and values

  Response: Reply that provides requested information or politely asks user to provide all null inputs

  ###

  User Statement: I am John.
  Prev User Statements: []
  Prev Responses: []
  Rules: User should provide their full name including first and last name. User should provide company name.
  Exit Scenarios:
  Example Entities: {'Customer_name': {'examples': ["First name,John,Mary,Jacob","Last name,Smith,Jane,J"]},'Company': {'examples': ['google,Microsoft, ABN Tech']},'Location': {'examples': ["State,Ontario,NewYork,Texas","City,Toronto,Vancouver","Country,Canada,USA"]}}
  Rationale: User did not provide their full name and company name yet. So, we ask for it.
  Entity State: {'Customer_name': null, 'Company': null}
  Type: reprompt
  Response: Thank you John, Could you please provide your full name and your company name?

  ###

  User Statement: I am John Smith.
  Prev User Statements: ['I am John']
  Prev Responses: ['Thank you John, Could you please provide your full name and your company name?']
  Rules: User should provide their full name including first and last name. User should provide company name.
  Exit Scenarios:
  Example Entities: {'Customer_name': {'examples': ["First name,John,Mary,Jacob","Last name,Smith,Jane,J"]},'Company': {'examples': ['google,Microsoft, ABN Tech']},'Location': {'examples': ["State,Ontario,NewYork,Texas","City,Toronto,Vancouver","Country,Canada,USA"]}}
  Rationale: User did not provide company name yet. So, we ask for it.
  Entity State: {'Customer_name': 'John Smith', 'Company': null}
  Type: reprompt
  Response: Thank you John for providing your full name. Could you also provide your company name?

  ###

  User Statement: I am from ABC Tech Corp.
  Prev User Statements: ['I am John', 'I am John Smith']
  Prev Responses: ['Thank you John, Could you please provide your full name and your company name?', "Thank you for providing your full name John Smith. Could you also provide your Company name."]
  Rules: User should provide their full name including first and last name. User should provide company name.
  Exit Scenarios:
  Example Entities: {'Customer_name': {'examples': ["First name,John,Mary,Jacob","Last name,Smith,Jane,J"]},'Company': {'examples': ['google,Microsoft, ABN Tech']},'Location': {'examples': ["State,Ontario,NewYork,Texas","City,Toronto,Vancouver","Country,Canada,USA"]}}
  Rationale: Required entities are captured and fulfills all the rules. Now we ask user on how we can assist.
  Entity State: {'Customer_name': 'John Smith', 'Company': 'ABC Tech Corp'}
  Type: fulfilled
  Response: Thank you John for providing your full name and your company name. How can I assist you today?

  ###

  User Statement: I am from XYZ.
  Prev User Statements: ['I am John', 'I am John Smith']
  Prev Responses: ['Thank you John, Could you please provide your full name and your company name?', "Thank you for providing your full name John Smith. Could you also provide your Company name."]
  Rules: User should provide their full name including first and last name. User should provide company name.
  Exit Scenarios: Exit if company name is XYZ
  Example Entities: {'Customer_name': {'examples': ["First name,John,Mary,Jacob","Last name,Smith,Jane,J"]},'Company': {'examples': ['google,Microsoft, ABN Tech']},'Location': {'examples': ["State,Ontario,NewYork,Texas","City,Toronto,Vancouver","Country,Canada,USA"]}}
  Rationale: User mentions company name as XYZ so we exit as per exit scenario specified.
  Entity State: {'Customer_name': 'John Smith', 'Company': 'ABC Tech Corp'}
  Type: exit
  Response:

  ###
`;

export const getEntityProcessingUserPrompt = (
  utterance: string,
  prevUserStatements: string[],
  prevResponses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: PromptWrapperSlotMap
) => dedent`

  User Statement: ${utterance}

  Prev User Statements: [${prevUserStatements}]

  Prev Responses: [${prevResponses}]

  Rules: ${rules.map((rule) => `- ${rule}`).join('\n')}

  Exit Scenarios: ${exitScenerios.map((exitScenerios) => `- ${exitScenerios}`).join('\n')}

  Example Entities: ${JSON.stringify(entityRef)}

  // Output format
  Rationale:

  Entity State:

  Type:

  Response:
`;
