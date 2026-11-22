// splitRequests: English texts (spec 0054, row 47). Every key here has its Greek in ../el/splitRequests.ts.
// The Split requests queue (spec 0047) and its sidebar count.
export const splitRequests = {
  title: 'Split requests',
  description:
    'Riders at a restaurant whose order does not fit one box. The rider keeps the first box; each other box goes as its own delivery, paid in full and charged to the restaurant.',
  loading: 'Loading split requests…',
  loadFailed: 'The split requests could not be loaded.',
  empty: 'No rider is waiting for a split.',
  columns: {
    restaurant: 'Restaurant',
    rider: 'Rider',
    proposed: 'Proposed',
    waiting: 'Waiting',
    answer: 'Answer',
  },
  leg: 'Leg {{number}} of {{total}}',
  size: {
    SMALL: 'Small',
    MEDIUM: 'Medium',
    LARGE: 'Large',
  },
  // "2 boxes: Large and Small". English says "boxes" for every count, as before.
  legs_one: '{{count}} boxes: {{list}}',
  legs_other: '{{count}} boxes: {{list}}',
  // The last two sizes of a list: "Large, Medium and Small".
  listAnd: '{{first}} and {{last}}',
  sentAs: 'Sent as {{size}}',
  boxesToConfirm: 'Boxes to confirm',
  box: 'Box {{number}}',
  addBox: 'Add a box',
  removeBox: 'Remove the last box',
  mayLeave: 'May leave at {{time}}',
  splitInto: 'Split into {{number}}',
  changeBoxes: 'Change boxes',
  itFits: 'It fits',
  noteLabel: 'A sentence for the rider (optional)',
  refuse: 'Refuse the split',
  saveFailed: 'The answer could not be saved. Try again.',
  badge: {
    countFailed: 'Open split requests could not be counted',
    waiting: '{{number}} waiting for an answer',
  },
}
