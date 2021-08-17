/* eslint-disable import/prefer-default-export */
import { Request } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';

interface Slot {
  type: {
    value?: string | undefined;
  };
  name: string;
}

interface QueryWord {
  rawText: string;
  canonicalText: string;
  startIndex: number;
  isNatoApco: boolean;
}

const firstLetterExpections = ['00', '000'];
const natoApcoExceptions = new Map([
  ['to', 2],
  ['for', 4],
]);

const processQuery = (query: string, entityVerboseValue: Request.VerboseValue[]): QueryWord[] => {
  const splitQuery = query.split(' ');
  const processed: QueryWord[] = [];
  let startIndex = 0;

  // Parse QueryWords from string
  for (let i = 0; i < splitQuery.length; ++i) {
    processed.push({
      rawText: splitQuery[i],
      startIndex,
      isNatoApco: false,
      canonicalText: '',
    });
    startIndex += splitQuery[i].length + 1;
  }

  // Determine which QueryWords are NATO/APCO and set canonical text by comparing to entityVerboseValue
  let i = 0;
  for (let j = 0; j < entityVerboseValue.length; ++j) {
    while (processed[i].startIndex !== entityVerboseValue[j].startIndex) {
      ++i;
    }
    processed[i].isNatoApco = true;
    processed[i].canonicalText = entityVerboseValue[j].canonicalText;
  }

  return processed;
};

// Combines the NATO/APCO words identified by LUIS together with their first letters.
// entity.verboseValue contains the words to parse and entity.value will store the result.
// The only exceptions to taking the first letter of the strings is '00' and '000'.
// This function also adds multi-digit numbers and other exceptions to entity.value if
// they are between detected NATO/APCO words.
export const natoApcoConverter = (entities: Request.Entity[], slots: Slot[], query: string) => {
  entities.forEach((entity) => {
    slots.forEach((slot) => {
      if (entity.name === slot.name && slot.type.value === Constants.SlotType.NATOAPCO) {
        // if using regex raw value will not be populated
        if (!Array.isArray(entity.verboseValue)) {
          const splitValue = entity.value.split(' ').map((value) => [value]);
          entity.value = splitValue.reduce((acc, cur) => (firstLetterExpections.includes(cur[0]) ? acc + cur[0] : acc + cur[0][0]), '').toUpperCase();
        } else {
          const processedQuery = processQuery(query, entity.verboseValue);
          entity.value = '';
          processedQuery.forEach((word, i) => {
            if (word.isNatoApco) {
              // Word was detected by LUIS successfully
              entity.value += firstLetterExpections.includes(word.canonicalText) ? word.canonicalText : word.canonicalText[0];
            } else if ((i > 0 && processedQuery[i - 1].isNatoApco) || (i < processedQuery.length - 1 && processedQuery[i + 1].isNatoApco)) {
              // Word was not detected by LUIS, check if it was missed and should be included
              if (word.rawText.match(/^[0-9]+$/)) {
                entity.value += word.rawText;
                word.isNatoApco = true;
              } else if (natoApcoExceptions.has(word.rawText)) {
                entity.value += natoApcoExceptions.get(word.rawText);
                word.isNatoApco = true;
              }
            }
          });
        }
      }
    });
  });
};
