export const regexMatcherSlots = [
  {
    key: 'slot1',
    name: 'name1',
    inputs: ['input1'],
    type: { value: 'value1' },
    color: 'color1',
  },
  {
    key: 'slot2',
    name: 'name2',
    inputs: [],
    type: { value: 'value2' },
  },
  {
    key: 'slot3',
    name: 'name3',
    inputs: ['input3'],
    type: {},
  },
  {
    key: 'slot4',
    name: 'name4',
    inputs: ['input4'],
  },
  {
    key: 'slot5',
    name: 'name5',
    type: { value: 'custom' },
  },
];

export const customTypeSlots = [
  {
    key: 'custom-slot1',
    name: 'custom-name1',
    inputs: ['custom-input1'],
    type: { value: 'custom' },
    color: 'custom-color1',
  },
  {
    key: 'custom-slot2',
    name: 'custom-name2',
    inputs: ['  abc,   def,   geh  ', 'x,y,z'],
    type: { value: 'custom' },
    color: 'custom-color2',
  },
  {
    key: 'custom-slot3',
    name: 'custom-name3',
    inputs: [' a ', '', ',', ', ,', '   ,   ', ',,,', ' b '],
    type: { value: 'custom' },
    color: 'custom-color3',
  },
];
