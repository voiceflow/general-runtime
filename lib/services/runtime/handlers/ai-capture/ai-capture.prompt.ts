/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { EntityCache, EntityRef } from './ai-capture.types';

export const getExtractionSystemPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
You're a support agent gathering data from a user, 
    You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entity.
    You might be provided a set of rules (guidelines) to understand the entity to be provided in response to the user statement or assess the user provided entity.
    You might be provided with example entities for reference to understand the entity_name and sample values.
    Provide the captured_entity_state in the following format that can be converted to dictionary with string values : {entity_name: entity_value}
    If the user statement does not contain the entity or if the entity provided by the user does not fulfill the rules, return captured_entity_state with null as the value for the entity.

    ###

    Follow the following format.

    User Statement: ${utterance}

    Rules: ${rules.map((rule) => `- ${rule}`).join('\n')}

    Example Entities: ${JSON.stringify(entityRef)}

    Captured Entity State: a dictionary representation of entity name and values

    ###

    User Statement: Yes, I'm particularly interested in 'Alan Turing' and 'Turing Test'.

    Rules: User must provide specific keyphrases for targeted research on a broad topic.

    Example Entities: {"keyphrase": {"examples": ["'Alan Turing'", "'Turing Test'", "'machine learning'"]}}

    Captured Entity State: {"keyphrase": "'Alan Turing','Turing Test'"}

    ###

    User Statement: Sure, it is 555-998-7654

    Rules: User must provide a valid phone number for their emergency contact.

    Example Entities: {"phone_number": {"examples": ["555-998-7654", "555-333-2121", "555-657-9302"]}}

    Captured Entity State: {"phone_number": "555-998-7654"}

    ###

    User Statement: I need 6 dozen chocolate donuts.

    Rules: User must specify donut type, box unit, and quantity.

    Example Entities: {"donut_type": {"examples": ["Chocolate", "Glazed", "Jelly", "Sprinkles", "Powdered"]}, "box_unit": {"examples": ["Single", "Half dozen", "Dozen"]}, "quantity": {"examples": ["1", "6", "12"]}}

    Captured Entity State: { "donut_type": "Chocolate", "box_unit": "Dozen", "quantity": "6" }

    ###

    User Statement: Sure, my email is alex@techco.com and the last time I got in was March 15th at 3:30 PM Eastern Time.

    Rules: User must provide a registered email address and the exact time of last access with timezone.

    Example Entities: {"email": {"examples": ["jane.doe@techco.com", "mike.smith@innovatech.com"]}, "last_access_time": {"examples": ["March 15th at 3:30 PM Eastern Time", "April 10th at 10:00 AM Pacific Time"]}}

    Captured Entity State: {"email": "alex@techco.com", "last_access_time": "March 15th at 3:30 PM Eastern Time"}

    ###

    User Statement: "I'd like to become a member."

    Rules: We need a valid email to create an account.

    Example Entities: {"email": {"examples": ["jane.doe@techco.com", "mike.smith@innovatech.com"]}}

    Captured Entity State: {"email":null}

    ###

`;

export const getExtractionPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
    
    User Statement: ${utterance}

    Rules: ${rules.map((rule) => `- ${rule}`).join('\n')}

    Example Entities: ${JSON.stringify(entityRef)}

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

export const getCaptureSystemPrompt = (
  messages: BaseUtils.ai.Message[],
  rules: string[],
  exitScenerios: string[],
  entityCache: EntityCache
) => dedent`
You're a support agent gathering data from a user, you need to politely ask questions to fill all "null" values in captured_entity_state.
###

Follow the following format.
Transcript: ${messages.map(({ role, content }) => `${role}: ${content}`).join('\n')}

Captured Entity State: ${JSON.stringify(entityCache)}

Rules: ${rules}

Exit Scenarios: ${
  exitScenerios.length
    ? `\nExit Scenarios:\n${exitScenerios.map((exitScenerio, index) => `${index + 1}. ${exitScenerio}`).join('\n')}\n`
    : ''
}

Rationale: Reasoning about entity that is either to be provided to user's question and next action of providing valid response or reasoning about valid entity that needs to be obtained from user and next action of requesting user to provide valid information

Type: Type indicating whether extracted entity 'fulfilled' the rules defined or a 'reprompt' is required or exit scenario is met.

Response: Reply that provides requested information or politely asks user to re-provide a valid input

###

Transcript: 
user_statement : I'm researching the history of artificial intelligence.
assistant : That's a fascinating subject. Are there specific keyphrases or figures in AI history you're focusing on?
user_statement : Yes, I'm particularly interested in 'Alan Turing' and 'Turing Test'.

Captured Entity State:: {'name': 'Alan Turing'}
Rules : User must provide specific keyphrases for targeted research on a broad topic.
Exit Scenarios: Exit once the keyphrases are provided and the search can be refined.

Rationale: The user has provided the keyphrase \"Alan Turing\" for their research on the history of artificial intelligence, allowing us to focus on that aspect.
Type: fulfilled
Response: Great choice! Alan Turing's contributions to AI history are significant. Would you like more information on his work or the Turing Test?

###

Transcript: 
user_statement : I'd like to place a large order for donuts.
assistant : Of course! We offer chocolate, glazed, jelly, sprinkles, and powdered donuts. You can order them by the single, half dozen, or dozen. How many and what type would you like?
user_statement : I need 6 dozen chocolate donuts.

Captured Entity State:: {'donut_type': 'Chocolate', 'box_unit': 'Dozen', 'quantity': '6'}
Rules : User must specify donut type, box unit, and quantity.
Exit Scenarios: Exit if the user requests a donut type not offered twice.Exit if the user requests more than 5 packs of a dozen donuts twice.Exit if the user does not provide entities after 6 turns.

Rationale: The user has provided the donut type, box unit, and quantity, so we can proceed with the order.
Type: fulfilled
Response: Great choice! Your order for 6 dozen chocolate donuts is all set. Would you like to add any other types or quantities to your order?

###

Transcript: 
user_statement : I need dowels for our live performance

Captured Entity State:: {'quantity': 'null'}
Rules : A clear quantity of dowels required must be specified by the user.
Exit Scenarios: Exit when the exact dowel quantity needed is determined.

Rationale: The user has mentioned needing dowels for a live performance but has not specified the quantity required, so we need to ask for that information to proceed.
Type: reprompt
Response: How many dowels do you need for your live performance?

`;

export const getCaptureUserPrompt = (
  messages: BaseUtils.ai.Message[],
  rules: string[],
  exitScenerios: string[],
  entityCache: EntityCache
) => dedent`

  Rules:
  ${rules.map((rule) => `- ${rule}`).join('\n')}
  Exit Scenarios: 
  ${
    exitScenerios.length
      ? `\nExit Scenarios:\n${exitScenerios.map((exitScenerio, index) => `${index + 1}. ${exitScenerio}`).join('\n')}\n`
      : ''
  }
  
  Transcript:
  ${messages.map(({ role, content }) => `${role}: ${content}`).join('\n')}

  Entities:
  ${JSON.stringify(entityCache)}

  // Output format
  Rationale:

  Type:

  Response: 
`;

export const getEntityProcessingSystemPrompt = (
  utterance: string,
  prev_user_statements: string[],
  prev_responses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: EntityRef
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

  Rules: ${rules.map((rule) => `${rule}`).join('\n')}

  Exit Scenarios: ${exitScenerios.map((exitScenerios) => `${exitScenerios}`).join('\n')}

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
  Response: Thank you John for providing your full name and your company name. How can I assit you today?

  ###

  User Statement: I am from XYZ.
  Prev User Statements: ['I am John', 'I am John Smith']
  Prev Responses: ['Thank you John, Could you please provide your full name and your company name?', "Thank you for providing your full name John Smith. Could you also provide your Company name."]
  Rules: User should provide their full name including first and last name. User should provide company name.
  Exit Scenarios: Exit if company name is XYZ
  Example Entities: {'Customer_name': {'examples': ["First name,John,Mary,Jacob","Last name,Smith,Jane,J"]},'Company': {'examples': ['google,Microsoft, ABN Tech']},'Location': {'examples': ["State,Ontario,NewYork,Texas","City,Toronto,Vancouver","Country,Canada,USA"]}}
  Rationale: User mentions company name as XYZ so we exit as per exit scenario specified.
  Entity State: {'Customer_name': 'John Smith', 'Company': 'ABC Tech Corp'}
  Type: exit1
  Response:
  
  ###
`;

export const getEntityProcessingUserPrompt = (
  utterance: string,
  prevUserStatements: string[],
  prevResponses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: EntityRef
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
