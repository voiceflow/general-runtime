import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import damerauLevenshteinDistance from 'talisman/metrics/damerau-levenshtein';
import dice from 'talisman/metrics/dice';

// converts levenshteinDistance to percentage
const damerauLevenshtein = (a: string, b: string) => 1 - damerauLevenshteinDistance(a, b) / Math.max(a.length, b.length);

// creates a score between a and b out of 100
// compound function leveraging algos with bias
export const comparison = (a: string, b: string) => {
  let score = damerauLevenshtein(a, b) + dice(a, b); // max score of 2

  // biased if starts with the same character
  if (a.charAt(0) === b.charAt(0)) {
    score += 0.1;
  }

  return Math.floor(score / 0.021);
};

// convert to lowercase and strip all accents: Crème Brulée => Creme Brulee
export const sanitize = (input: unknown): string =>
  String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const getSynonym = (_query: string, _samples: string[] = [], tolerance = 60): string => {
  // ['small, tiny, petite', 'big, large', 'medium'] => [['small', 'tiny', 'petite'], ['big', 'large']]
  const samples = _samples.reduce<string[][]>((acc, input = '') => {
    const values = input.split(',');
    // only map synonyms on things that have more than 1 value
    if (values.length > 1) acc.push(values);
    return acc;
  }, []);

  const best = {
    score: 0,
    word: '',
  };
  const query = sanitize(_query);
  for (let i = 0; i < samples.length; i++) {
    const synonyms = samples[i].map(sanitize);

    // eslint-disable-next-line no-restricted-syntax
    for (const synonym of synonyms) {
      const score = comparison(query, synonym);

      const word = samples[i][0]; // original word to map to
      // if perfect score (exact match) exit early
      if (score === 100) return word;
      if (score > best.score) {
        best.score = score;
        best.word = word;
      }
    }
  }
  if (best.score > tolerance) return best.word;

  // if no matches, return the original input
  return _query;
};

export const rectifyEntityValue = (intentReq: BaseRequest.IntentRequest, model: BaseModels.PrototypeModel): BaseRequest.IntentRequest => {
  intentReq.payload.entities.forEach((entity) => {
    const entityDefinition = model.slots.find((item) => item.name === entity.name);
    if (!entityDefinition) return;

    entity.value = getSynonym(entity.value, entityDefinition.inputs);
  });

  return intentReq;
};
