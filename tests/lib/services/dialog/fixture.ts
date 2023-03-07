import { BaseRequest, BaseTrace } from '@voiceflow/base-types';
import sinon from 'sinon';

import CacheDataAPI from '@/lib/services/state/cacheDataAPI';
import { Context } from '@/types';

export const mockUnfulfilledIntentRequest: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want some large chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [
      {
        name: 'size',
        value: 'large',
      },
    ],
  },
};

export const mockLM = {
  slots: [
    {
      key: 'tjl3zwj',
      name: 'size',
      type: {
        value: 'custom',
      },
      color: '#5C6BC0',
      inputs: ['big,large,huge,gigantic', 'small,tiny,mini'],
    },
    {
      key: '14o3z7z',
      name: 'topping',
      type: {
        value: 'custom',
      },
      color: '#4F9ED1',
      inputs: ['pepperoni,sausage,meat', 'cheese,plain'],
    },
    {
      key: '4w253zil',
      name: 'flavor',
      type: {
        value: 'custom',
      },
      color: '#A086C4',
      inputs: ['bbq,barbecue', 'spicy', 'honey garlic'],
    },
  ],
  intents: [
    {
      key: 'e4p3z4x',
      name: 'pizza_order',
      slots: [
        {
          id: 'tjl3zwj',
          dialog: {
            prompt: [
              {
                text: 'what size',
                slots: [],
              },
            ],
            confirm: [
              {
                text: '',
                slots: [],
              },
            ],
            utterances: [
              {
                text: 'I want {{[size].tjl3zwj}} ',
                slots: ['tjl3zwj'],
              },
              {
                text: '{{[size].tjl3zwj}} pizza',
                slots: ['tjl3zwj'],
              },
              {
                text: '{{[size].tjl3zwj}} ',
                slots: ['tjl3zwj'],
              },
            ],
            confirmEnabled: false,
          },
          required: true,
        },
        {
          id: '14o3z7z',
          dialog: {
            prompt: [
              {
                text: 'What topping',
                slots: [],
              },
            ],
            confirm: [
              {
                text: '',
                slots: [],
              },
            ],
            utterances: [
              {
                text: 'I want {{[topping].14o3z7z}} pizza',
                slots: ['14o3z7z'],
              },
              {
                text: '{{[topping].14o3z7z}} pizza',
                slots: ['14o3z7z'],
              },
              {
                text: '{{[topping].14o3z7z}} ',
                slots: ['14o3z7z'],
              },
            ],
            confirmEnabled: false,
          },
          required: true,
        },
      ],
      inputs: [
        {
          text: 'order a {{[size].tjl3zwj}} pizza with {{[topping].14o3z7z}} ',
          slots: ['tjl3zwj', '14o3z7z'],
        },
        {
          text: '{{[size].tjl3zwj}} pizza',
          slots: ['tjl3zwj'],
        },
        {
          text: 'I want a {{[topping].14o3z7z}} pizza',
          slots: ['14o3z7z'],
        },
        {
          text: 'A {{[size].tjl3zwj}} {{[topping].14o3z7z}} pizza',
          slots: ['tjl3zwj', '14o3z7z'],
        },
        {
          text: 'I want a {{[size].tjl3zwj}} {{[topping].14o3z7z}} pizza',
          slots: ['tjl3zwj', '14o3z7z'],
        },
      ],
    },
    {
      key: 'g61z3zcz',
      name: 'wings_order',
      slots: [
        {
          id: 'tjl3zwj',
          dialog: {
            prompt: [
              {
                text: '',
                slots: [],
              },
            ],
            confirm: [
              {
                text: '',
                slots: [],
              },
            ],
            utterances: [],
            confirmEnabled: false,
          },
          required: false,
        },
        {
          id: '4w253zil',
          dialog: {
            prompt: [
              {
                text: 'what flavor?',
                slots: [],
              },
            ],
            confirm: [
              {
                text: '',
                slots: [],
              },
            ],
            utterances: [
              {
                text: '{{[flavor].4w253zil}} ',
                slots: ['4w253zil'],
              },
              {
                text: '{{[flavor].4w253zil}} wings',
                slots: ['4w253zil'],
              },
              {
                text: 'I want {{[flavor].4w253zil}} ',
                slots: ['4w253zil'],
              },
            ],
            confirmEnabled: false,
          },
          required: true,
        },
      ],
      inputs: [
        {
          text: 'wing with {{[flavor].4w253zil}} ',
          slots: ['4w253zil'],
        },
        {
          text: 'I would like {{[size].tjl3zwj}} {{[flavor].4w253zil}} wings',
          slots: ['tjl3zwj', '4w253zil'],
        },
        {
          text: 'some {{[flavor].4w253zil}} wings',
          slots: ['4w253zil'],
        },
        {
          text: 'I want to order {{[size].tjl3zwj}} chicken wings',
          slots: ['tjl3zwj'],
        },
        {
          text: 'I want to order chicken wings',
          slots: [],
        },
      ],
    },
  ],
};

export const mockRegularUnrelatedResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want to order some chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [],
  },
};

export const mockDMPrefixUnrelatedResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'b5c1b7fae5e4c5b87a39e68d8e27028f I want to order some chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [
      {
        name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
        value: 'b5c1b7fae5e4c5b87a39e68d8e27028f',
      },
    ],
  },
};

export const mockDMPrefixedUnrelatedSingleEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'cd55d3ff73dce9bbb75edc60ab5c81be I want a small chicken wings',
    intent: {
      // eslint-disable-next-line no-secrets/no-secrets
      name: 'dm_cd55d3ff73dce9bbb75edc60ab5c81be_wings_order',
    },
    entities: [
      {
        name: 'dm_cd55d3ff73dce9bbb75edc60ab5c81be',
        value: 'cd55d3ff73dce9bbb75edc60ab5c81be',
      },
      {
        name: 'size',
        value: 'small',
      },
    ],
  },
};

export const mockRegularNoEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want a pizza',
    intent: {
      name: 'pizza_order',
    },
    entities: [],
  },
};

export const mockDMPrefixedNoEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'b5c1b7fae5e4c5b87a39e68d8e27028f I want a pizza',
    intent: {
      // eslint-disable-next-line no-secrets/no-secrets
      name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f_pizza_order',
    },
    entities: [
      {
        name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
        value: 'b5c1b7fae5e4c5b87a39e68d8e27028f',
      },
    ],
  },
};

export const mockRegularMultipleEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want a large pepperoni pizza',
    intent: {
      name: 'pizza_order',
    },
    entities: [
      {
        name: 'size',
        value: 'large',
      },
      {
        name: 'topping',
        value: 'pepperoni',
      },
    ],
  },
};

export const mockDMPrefixedMultipleEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'b5c1b7fae5e4c5b87a39e68d8e27028f I want a large pepperoni pizza',
    intent: {
      // eslint-disable-next-line no-secrets/no-secrets
      name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f_pizza_order',
    },
    entities: [
      {
        name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
        value: 'b5c1b7fae5e4c5b87a39e68d8e27028f',
      },
      {
        name: 'size',
        value: 'large',
      },
      {
        name: 'topping',
        value: 'pepperoni',
      },
    ],
  },
};

export const mockRegularSingleEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want a small pizza',
    intent: {
      name: 'pizza_order',
    },
    entities: [
      {
        name: 'size',
        value: 'small',
      },
    ],
  },
};

export const mockDMPrefixedSingleEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'b5c1b7fae5e4c5b87a39e68d8e27028f I want a small pizza',
    intent: {
      // eslint-disable-next-line no-secrets/no-secrets
      name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f_pizza_order',
    },
    entities: [
      {
        name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
        value: 'b5c1b7fae5e4c5b87a39e68d8e27028f',
      },
      {
        name: 'size',
        value: 'small',
      },
    ],
  },
};

export const mockDMPrefixedNonSubsetEntityResult: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'A crazy blue query',
    intent: {
      name: 'dm_something_crazy',
    },
    entities: [
      {
        name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
        value: 'b5c1b7fae5e4c5b87a39e68d8e27028f',
      },
      {
        name: 'color',
        value: 'blue',
      },
    ],
  },
};

export const mockVersion = {
  prototype: {
    model: mockLM,
  },
  platformData: {
    settings: {
      defaultVoice: 'Default voice',
    },
  },
};

export const mockProjectNLP = {};

export const mockDataAPI = {
  getVersion: sinon.stub().resolves(mockVersion),
  getProject: sinon.stub().resolves(mockProjectNLP),
} as unknown as CacheDataAPI;

export const mockFulfilledIntentRequest: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want some spicy chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [
      {
        name: 'flavor',
        value: 'spicy',
      },
    ],
  },
};

export const mockDMContext: Context = {
  state: {
    stack: [],
    turn: {},
    storage: {
      dm: {
        intentRequest: {
          type: 'intent',
          payload: {
            query: 'I want a large pizza',
            intent: {
              name: 'pizza_order',
            },
            entities: [
              {
                name: 'size',
                value: ['large'],
              },
              {
                name: 'dm_b5c1b7fae5e4c5b87a39e68d8e27028f',
                value: ['b5c1b7fae5e4c5b87a39e68d8e27028f'],
              },
            ],
          },
        },
      },
    },
    variables: {},
  },
  request: mockUnfulfilledIntentRequest,
  projectID: '507f191e810c19729de860ea',
  versionID: '5ff486b75b99f8b36505ecfd',
  trace: [],
  data: {
    api: mockDataAPI,
  },
};

export const mockRegularContext: Context = {
  state: {
    stack: [],
    turn: {},
    storage: {},
    variables: {},
  },
  request: mockUnfulfilledIntentRequest,
  projectID: '507f191e810c19729de860ea',
  versionID: '5ff486b75b99f8b36505ecfd',
  trace: [],
  data: {
    api: mockDataAPI,
  },
};

export const mockEntitySynonymRequest: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want some huge chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [
      {
        name: 'size',
        value: 'huge',
      },
    ],
  },
};

export const mockEntityNonSynonymRequest: BaseRequest.IntentRequest = {
  type: BaseRequest.RequestType.INTENT,
  payload: {
    query: 'I want some medium chicken wings',
    intent: {
      name: 'wings_order',
    },
    entities: [
      {
        name: 'size',
        value: 'medium',
      },
    ],
  },
};

export const mockEntityFillingTrace: BaseTrace.EntityFillingTrace = {
  type: BaseTrace.TraceType.ENTITY_FILLING,
  payload: {
    entityToFill: 'flavor',
    intent: mockUnfulfilledIntentRequest,
  },
};

export const mockEntityFillingTraceWithElicit: BaseTrace.EntityFillingTrace = {
  type: BaseTrace.TraceType.ENTITY_FILLING,
  payload: {
    entityToFill: 'flavor',
    intent: { ...mockUnfulfilledIntentRequest, ELICIT: true } as any,
  },
};
