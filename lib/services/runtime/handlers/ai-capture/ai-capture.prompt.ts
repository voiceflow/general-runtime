/* eslint-disable sonarjs/no-nested-template-literals */
import { BaseUtils } from '@voiceflow/base-types';
import dedent from 'dedent';

import { EntityCache, EntityRef } from './ai-capture.types';

export const getExtractionSystemPrompt = () => dedent`
You're a support agent gathering data from a user, 
    You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entity.
    You might be provided a set of rules (guidelines) to understand the entity to be provided in response to the user statement or assess the user provided entity.
    You might be provided with example entities for reference to understand the entity_name and sample values.
    Provide the captured_entity_state in the following format that can be converted to dictionary with string values : {entity_name: entity_value}
    If the user statement does not contain the entity or if the entity provided by the user does not fulfill the rules, return captured_entity_state with null as the value for the entity.

    ---

    Follow the following format.

    User Statement: Input from user

    Rules: set of rules to follow to validate extracted entity

    Example Entities: example values for Captured Entity State

    Captured Entity State: a dictionary representation of entity name and values

    ---

    User Statement: Yes, I'm particularly interested in 'Alan Turing' and 'Turing Test'.

    Rules: User must provide specific keyphrases for targeted research on a broad topic.

    Example Entities: {"keyphrase": {"examples": ["'Alan Turing'", "'Turing Test'", "'machine learning'"]}}

    Captured Entity State: {"keyphrase": "'Alan Turing','Turing Test'"}

    ---

    User Statement: Sure, it is 555-998-7654

    Rules: User must provide a valid phone number for their emergency contact.

    Example Entities: {"phone_number": {"examples": ["555-998-7654", "555-333-2121", "555-657-9302"]}}

    Captured Entity State: {"phone_number": "555-998-7654"}

    ---

    User Statement: I need 6 dozen chocolate donuts.

    Rules: User must specify donut type, box unit, and quantity.

    Example Entities: {"donut_type": {"examples": ["Chocolate", "Glazed", "Jelly", "Sprinkles", "Powdered"]}, "box_unit": {"examples": ["Single", "Half dozen", "Dozen"]}, "quantity": {"examples": ["1", "6", "12"]}}

    Captured Entity State: { "donut_type": "Chocolate", "box_unit": "Dozen", "quantity": "6" }

    ---

    User Statement: Sure, my email is alex@techco.com and the last time I got in was March 15th at 3:30 PM Eastern Time.

    Rules: User must provide a registered email address and the exact time of last access with timezone.

    Example Entities: {"email": {"examples": ["jane.doe@techco.com", "mike.smith@innovatech.com"]}, "last_access_time": {"examples": ["March 15th at 3:30 PM Eastern Time", "April 10th at 10:00 AM Pacific Time"]}}

    Captured Entity State: {"email": "alex@techco.com", "last_access_time": "March 15th at 3:30 PM Eastern Time"}

    ---

    User Statement: "I'd like to become a member."

    Rules: We need a valid email to create an account.

    Example Entities: {"email": {"examples": ["jane.doe@techco.com", "mike.smith@innovatech.com"]}}

    Captured Entity State: {"email":null}

`;

export const getExtractionPrompt = (utterance: string, rules: string[], entityRef: EntityRef) => dedent`
    
    User Statement: ${utterance}

    Rules: ${rules.map((rule) => `- ${rule}`).join('\n')}

    Example Entities: ${JSON.stringify(entityRef)}

    // Output format

    Captured Entity State:

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
`
;

export const getEntityProcessingSystemPrompt = (utterance: string, prev_user_statements: string[], prev_responses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: EntityRef) => dedent`
  You will be given a user statement, which is a request or question from the user that often pertains to a certain type of entity.
  You will also be provided a set of rules (guidelines) to understand the entity to be provided in response to the user statement or assess the user provided entity.
  You will also provided with exit scenarios that indicate the scenarios when the conversation should end.
  Provide the entity_state in the following format that can be converted to dictionary object : {entity_name: entity_value}.
  Generate the values for entity state depending on the user statement, Prev User Statements or response provided.
  The value for type should be set to 'fulfilled' only if the entities captured fulfills all the rules.
  Strictly provide the following fields in output :  Type, Entity State, Response, Rationale
  ---

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

  ---
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

  ---

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

  ---

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

  ---

  User Statement: What's the current temperature outside?

  Prev User Statements: []

  Prev Responses: []

  Rules: Provide temperature in both Celsius and Fahrenheit upon request.

  Exit Scenarios: Exit once the current temperature is provided.

  Example Entities: {'temperature_celsius': {'examples': ["20Â°C, 25Â°C, 30Â°C"]}, 'temperature_fahrenheit':{'examples': ["68Â°F, 77Â°F, 86Â°F"]}}

  Rationale: The user is asking for the current temperature, which according to the rules, should be provided in both Celsius and Fahrenheit. We provide the required information and capture the entities and generate appropriate decision type.

  Type: fulfilled

  Entity State: {'temperature_celsius': '25Â°C', 'temperature_fahrenheit': '77Â°F'}

  Response: Sure, the current temperature is 25Â°C (77Â°F).

  ---

  User Statement: The space is 1.5 meters wide, 60cm deep, and 2 meters tall.

  Prev User Statements: ['I need a new wardrobe for my bedroom.']

  Prev Responses: ["What are the dimensions you're working with?"]

  Rules: User must provide length, width, and height in meters or cm.

  Exit Scenarios: Exit if no wardrobes match the dimensions. Exit if the entities are captured. Exit if the user does not respond after 2 reprompts.

  Example Entities: {'length':{'examples': ['60cm, 70cm, 80cm']}, 'width': {'examples': ['1.5 meters, 1.6 meters, 1.4 meters']}, 'height': {'examples': ['2 meters, 2.1 meters, 1.9 meters']}}

  Rationale: The user is asking for the temperature required for baking a cake, which falls under the rule of providing cooking temperatures in both Celsius and Fahrenheit.

  Type: fulfilled

  Entity State: {'length': '60cm', 'width': '1.5 meters', 'height': '2 meters'}

  Response:

  ---

  User Statement: Hi my name is Ashley and I want to join your membership

  Prev User Statements: []

  Prev Responses: []

  Rules: User must be above 18 to join the membership.

  Exit Scenarios: Exit if the user is below 18. Exit if the entities are captured. Exit if user declines to provide the age.

  Example Entities: {age':{'examples': ['19, 20, 21']}}

  Rationale: The user has not stated their age, so we ask for it.

  Type: reprompt

  Entity State: {'name': 'Ashley', 'age': null}

  Response: Thank you Ashley, may I know your age please?

  ---

  User Statement: What floors do the science fiction books occupy in the library?

  Prev User Statements: []

  Prev Responses: []

  Rules: Locations within a building are often described using a range of floors, expressed as ordinal data.

  Exit Scenarios: Exit once the range of floors is provided.

  Example Entities: {'ordinal_range': {'examples': ['1st to 3rd, 2nd to 4th, 5th to 7th']}}

  Rationale: The user inquired about the location of a specific genre of books, so we provide the range of floors where they can be found.

  Type: fulfilled

  Entity State: {'ordinal_range': '2nd to 4th'}

  Response: Science fiction books are located from the 2nd to the 4th floor. Which floor would you like to start with?

  ---

  User Statement: How much of the project budget has been spent?
  Prev User Statements: []
  Prev Responses: []
  Rules: Budget utilization is reported as a percentage of the total budget.
  Exit Scenarios: Exit after providing the budget spent percentage.
  Example Entities: {'percentage': {'examples': ['20%, 40%, 60%']}}
  Rationale: The user asked about the budget utilization for a project, so we provide the spent percentage.
  Type: fulfilled
  Entity State: {'percentage': '40%'}
  Response: So far, 40% of the project budget has been utilized.

  ---

  User Statement: What place did I finish in the race?
  Prev User Statements: []
  Prev Responses: []
  Rules: Finishing positions in races are expressed using ordinal numbers.
  Exit Scenarios: Exit once the user's finishing position is provided.
  Example Entities: {'ordinal':{'examples': ['2nd, 3rd, 4th']}}
  Rationale: The user asked about their finishing position in a race, so we provide it using ordinal data.
  Type: fulfilled
  Entity State: {'ordinal': '4th'}
  Response: You finished in 4th place in the race.

  ---

  User Statement: How much will it cost me in Canadian dollars to buy a laptop from your US store?
  Prev User Statements: []
  Prev Responses: []
  Rules: User must provide a product price in the store's currency to calculate the cost in their local currency.
  Exit Scenarios: Exit if the cost in the local currency is provided.
  Example Entities: {'currency_amount':{'examples': ['800, 1000, 1200']},'currency_type_from': {'examples': ['USD']},'currency_type_to': {'examples': ['CAD']}}
  Rationale: The user has not provided the laptop's price in USD, so we ask for it to calculate the cost in CAD.
  Type: reprompt
  Entity State: {'currency_amount': null, 'currency_type_from': 'USD', 'currency_type_to': 'CAD'}
  Response: To provide an accurate cost, could you specify the price of the laptop in USD?

  ---

  User Statement: I would like to join your gym
  Prev User Statements: []
  Prev Responses: []
  Rules: We need to know the user's location to find the nearest gym.
  Exit Scenarios: Exit when user provides an unserviceable location.Exit if the entities are captured.Exit if user refuses to share their location.
  Example Entities: {'location':{'examples': ['Paris, France, Lyon, France, Marseille, France']}}
  Rationale: The user has not stated their location, so we ask for it.
  Type: reprompt
  Entity State: {'location': null}
  Response: That sounds great! Could you provide your location so I can find the closest gym to you?

  ---

  User Statement: I need to know the fat content in this yogurt.
  Prev User Statements: []
  Prev Responses: []
  Rules: Nutritional information, such as fat content, is expressed as a percentage of the total composition.
  Exit Scenarios: Exit once the fat content percentage is provided.
  Example Entities: {'percentage': {'examples': ['2%, 5%, 8%']}}
  Rationale: The user inquired about the nutritional information of a product, so we provide the specific fat content percentage.
  Type: fulfilled
  Entity State: {'percentage': '5%'}
  Response: The fat content in this yogurt is 5%.

  ---

  User Statement: I received a gift card in euros, but I need to know its value in dollars.
  Prev User Statements: []
  Prev Responses: []
  Rules: Convert gift card values between currencies upon request.
  Exit Scenarios: Exit once the gift card's value in the requested currency is provided.
  Example Entities: {'currency_amount': {'examples': ['100, 200, 300']}, 'currency_type_from':{'examples': ['EUR']}, 'currency_type_to': {'examples': ['USD']}}
  Rationale: The user has a gift card in euros and wants to know its value in dollars, so we ask for the euro amount to convert.
  Type: reprompt
  Entity State: {'currency_amount': null, 'currency_type_from': 'EUR', 'currency_type_to': 'USD'}
  Response: How much is the gift card worth in euros?

  ---

  User Statement: I'd like to convert it to GBP.
  Prev User Statements: ['I want to donate to an international charity. How much will it be in their currency?']
  Prev Responses: ['Which currency would you like to convert your donation into?']
  Rules: User must specify the target currency for international donations.
  Exit Scenarios: Exit once the conversion rate to the target currency is provided.
  Example Entities: {'currency_type_from':{'examples': ['USD']}, 'currency_type_to': {'examples': ['GBP']}}
  Rationale: The user specified GBP as the target currency for their donation, so we can provide the conversion rate.
  Type: fulfilled
  Entity State: {'currency_type_from': 'USD', 'currency_type_to': 'GBP'}
  Response:

  ---

  User Statement: I want to exchange my dollars to euros.
  Prev User Statements: []
  Prev Responses: []
  Rules: User must specify an amount and currency types for exchange.
  Exit Scenarios: Exit if the currency exchange details are captured.
  Example Entities: {'currency_amount': {'examples': ['100, 500, 1000']}, 'currency_type_from':{'examples': ['USD']}, 'currency_type_to':{'examples': ['EUR']}}
  Rationale: The user has not stated the amount they wish to exchange, so we ask for it along with confirming the currency types.
  Type: reprompt
  Entity State: {'currency_amount': null, 'currency_type_from': 'USD', 'currency_type_to': 'EUR'}
  Response: Sure, how much in USD would you like to exchange?

  ---

  User Statement: I'm looking for books on the bestseller list.
  Prev User Statements: []
  Prev Responses: []
  Rules: User must specify a range of ordinal positions to receive relevant information.
  Exit Scenarios: Exit once the desired range of bestseller positions is provided.
  Example Entities: {'ordinal_range': {'examples': ['1st to 5th, 6th to 10th, 11th to 15th']}}
  Rationale: To narrow down the selection, we need to know the specific range of bestseller positions the user is interested in.
  Type: reprompt
  Entity State: {'ordinal_range': null}
  Response: Are you interested in books from the top 1st to 5th positions or the 6th to 10th?

  ---

  User Statement: What's the percentage of attendance for the online course?
  Prev User Statements: []
  Prev Responses: []
  Rules: Attendance rates for courses are often expressed as a percentage.
  Exit Scenarios: Exit once the attendance rate percentage is provided.
  Example Entities: {'percentage': {'examples': ['80%, 92%, 100%']}}
  Rationale: The user inquired about attendance for an online course, so we provide the attendance rate percentage.
  Type: fulfilled
  Entity State: {'percentage': '92%'}
  Response: The attendance rate for the online course is at 92%.

  ---

  User Statement: I want to donate to an international charity. How much will it be in their currency?
  Prev User Statements: []
  Prev Responses: []
  Rules: User must specify the target currency for international donations.
  Exit Scenarios: Exit once the conversion rate to the target currency is provided.
  Example Entities: {'currency_type_from': {'examples': ['USD']},'currency_type_to': {'examples': ['GBP']}}
  Rationale: The user wants to make an international donation, so we ask for the target currency to provide the conversion.
  Type: reprompt
  Entity State: {'currency_type_from': 'USD', 'currency_type_to': null}
  Response: Which currency would you like to convert your donation into?

  ---

  User Statement: I'm looking for positions that pay between $50,000 and $70,000 annually.
  Prev User Statements: ["I'm looking for a job within a specific salary range."]
  Prev Responses: ['What salary range are you considering?']
  Rules: User must specify a salary range to receive relevant job listings.
  Exit Scenarios: Exit once the desired salary range is provided.
  Example Entities: {'salary_range': {'examples': ['$40,000 to $60,000, $50,000 to $70,000, $60,000 to $80,000']}}
  Rationale: The user specified their salary range, so we can now provide job listings within that range.
  Type: fulfilled
  Entity State: {'salary_range': '$50,000 to $70,000'}
  Response:

  ---

  User Statement: I still want unicorn donuts.
  Prev User Statements: ['I want to order donuts.', 'Do you have unicorn donuts?']
  Prev Responses: ['Sure, we have five types of donuts and they come in a single, half dozen or dozen. Which type would you like to order?', "I'm sorry, we don't offer unicorn donuts. We have chocolate, glazed, jelly, sprinkles, and powdered donuts. Would you like one of these?"]
  Rules: User must specify donut type, box unit, and quantity.
  Exit Scenarios: Exit if the user requests a donut type not offered twice. Exit if the user requests more than 5 packs of a dozen donuts twice. Exit if the user does not provide entities after 6 turns.
  Example Entities: {'donut_type': {'examples': ['Chocolate, Glazed, Jelly, Sprinkles, Powdered']},'box_unit': {'examples': ['Single, Half dozen, Dozen']},'quantity': {'examples': ['1, 2, 3']}}
  Rationale: Exiting conversation as the user insists on a non-offered donut type.
  Type: exit1
  Entity State: {'donut_type': null, 'box_unit': null, 'quantity': null}
  Response: Unfortunately, we don't have unicorn donuts. We need to adhere to our available selections: chocolate, glazed, jelly, sprinkles, and powdered. We cannot process orders for other types.

  ---
  
  
  
`;

export const getEntityProcessingUserPrompt = (utterance: string, prev_user_statements: string[], prev_responses: string[],
  rules: string[],
  exitScenerios: string[],
  entityRef: EntityRef) => dedent`

  User Statement: ${utterance}

  Prev User Statements: [${prev_user_statements}]

  Prev Responses: [${prev_responses}]

  Rules: ${rules.map((rule) => ` ${rule}.`).join('\n')}

  Exit Scenarios: ${exitScenerios.map((exitScenerios) => `- ${exitScenerios}`).join('\n')}

  Example Entities: ${JSON.stringify(entityRef)}

  // Output format
  Rationale:

  Entity State:

  Type:

  Response: 
`;

