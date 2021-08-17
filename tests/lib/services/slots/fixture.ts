import { Request } from '@voiceflow/base-types';
import sinon from 'sinon';

const version = {
  prototype: {
    model: {
      slots: [
        {
          name: 'natoSlot',
          type: {
            value: 'VF.NATOAPCO',
          },
        },
        {
          name: 'otherSlot',
          type: {
            value: 'VF.NUMBER',
          },
        },
      ],
    },
  },
};

export const context = {
  data: {
    api: {
      getVersion: sinon.stub().resolves(version),
    },
  },
};

export const NATO_REQUEST_1 = {
  request: {
    type: Request.RequestType.INTENT,
    payload: {
      intent: {
        name: 'foo',
      },
      entities: [
        {
          name: 'natoSlot',
          verboseValue: [
            {
              rawText: 'November',
              canonicalText: 'November',
              startIndex: 0,
            },
            {
              rawText: 'Ida',
              canonicalText: 'India',
              startIndex: 9,
            },
            {
              rawText: 'Charles',
              canonicalText: 'Charlie',
              startIndex: 13,
            },
            {
              rawText: 'Echo',
              canonicalText: 'Echo',
              startIndex: 21,
            },
            {
              rawText: 'Dash',
              canonicalText: '-',
              startIndex: 26,
            },
            {
              rawText: 'One',
              canonicalText: '1',
              startIndex: 31,
            },
            {
              rawText: 'Thousand',
              canonicalText: '000',
              startIndex: 35,
            },
            {
              rawText: 'Point',
              canonicalText: '.',
              startIndex: 44,
            },
            {
              rawText: 'Hundred',
              canonicalText: '00',
              startIndex: 50,
            },
          ],
        },
        {
          name: 'otherSlot',
          value: 'unchanged',
        },
      ],
      query: 'November Ida Charles Echo Dash One Thousand Point Hundred',
    },
  },
};

export const NATO_REQUEST_2 = {
  request: {
    type: Request.RequestType.INTENT,
    payload: {
      intent: {
        name: 'foo',
      },
      entities: [
        {
          name: 'natoSlot',
          verboseValue: [
            {
              rawText: 'Alpha',
              canonicalText: 'Alfa',
              startIndex: 43,
            },
            {
              rawText: '3',
              canonicalText: '3',
              startIndex: 52,
            },
            {
              rawText: 'Bravo',
              canonicalText: 'Bravo',
              startIndex: 58,
            },
            {
              rawText: 'Charlie',
              canonicalText: 'Charlie',
              startIndex: 67,
            },
          ],
        },
      ],
      query: 'It is March 10 and the license plate is 12 Alpha to 3 for Bravo 45 Charlie 67',
    },
  },
};

export const NATO_REQUEST_3 = {
  request: {
    type: Request.RequestType.INTENT,
    payload: {
      intent: {
        name: 'foo',
      },
      entities: [
        {
          name: 'natoSlot',
          verboseValue: [
            {
              rawText: 'Alpha',
              canonicalText: 'Alfa',
              startIndex: 0,
            },
            {
              rawText: 'Bravo',
              canonicalText: 'Bravo',
              startIndex: 22,
            },
          ],
        },
      ],
      query: 'Alpha 12 to 34 for 56 Bravo',
    },
  },
};
