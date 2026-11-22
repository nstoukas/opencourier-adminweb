// Words used on more than one screen (spec 0054, row 47). A module's own sentences live in its own
// file (deliveries.ts, partners.ts, ...); only a word that really is the same everywhere goes here.
export const common = {
  appName: 'OpenCourier Admin',
  loading: 'Loading…',
  notLoadedYet: 'Not loaded yet',
  saving: 'Saving…',
  save: 'Save',
  saveChanges: 'Save changes',
  cancel: 'Cancel',
  close: 'Close',
  open: 'Open',
  edit: 'Edit',
  delete: 'Delete',
  remove: 'Remove',
  add: 'Add',
  back: 'Back',
  confirm: 'Confirm',
  tryAgain: 'Try again',
  retry: 'Retry',
  reload: 'Reload',
  search: 'Search',
  yes: 'Yes',
  no: 'No',
  none: 'None',
  optional: '(optional)',
  required: 'Required',
  dash: '—',
  of: 'of',
  from: 'From',
  to: 'to',
  minutes_one: '{{count}} min',
  minutes_other: '{{count}} min',
  // "at" before a time of day, through useFormat().atTime. Two keys because Greek uses another word at
  // one o'clock ("στη 01:05", "στις 13:05"); English says "at" for both (decision 47.16).
  atTime: 'at {{time}}',
  atOneOClock: 'at {{time}}',
  // The words of a refusal the server sent with no code we know: its own sentence is shown instead.
  serverError: 'Something went wrong. Try again in a minute.',
  noConnection: "The co-op's server didn't answer. Check your internet connection and try again.",
  // A delivery record line written before spec 0054, stored only in English (AC-4).
  recordedInEnglish: 'recorded in English',
}

// The language switch in the sidebar (spec 0054, AC-2).
export const language = {
  label: 'Language',
  saveFailed: 'The language changed here, but the server could not save it. It will ask again next time.',
}
