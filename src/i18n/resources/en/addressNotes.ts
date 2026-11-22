// addressNotes: English texts (spec 0054, row 47). Every key here has its Greek in ../el/addressNotes.ts.
// Riders' notes about places (src/pages/address-notes, src/modules/address-notes).
export const addressNotes = {
  // The Address notes page.
  page: {
    title: 'Address notes',
    description:
      'What riders wrote about places. Notes describe the place, never the person; delete any that break the rules.',
    loading: 'Loading',
    flaggedHeading: 'Flagged by riders',
    flaggedFailed: 'Could not load the flagged notes.',
    noFlagged: 'No flagged notes.',
    findHeading: 'Find a note by street',
    searchLabel: 'Street, address or coordinates',
    searchFailed: 'Could not load the notes.',
    typePrompt: 'Type a street, an address or coordinates to see the notes there.',
    noMatch: 'No notes match.',
    previous: 'Previous',
    next: 'Next',
    pageOf: 'Page {{page}} of {{pages}}',
  },
  // One note (AddressNoteRow).
  row: {
    aRider: 'A rider',
    anAdmin: 'An admin',
    aRestaurant: 'A restaurant',
    unknown: 'Unknown',
    deleted: 'Note deleted.',
    deleteFailed: 'The note could not be deleted.',
    dismissed: 'Flags dismissed. The note stays.',
    dismissFailed: 'The flags could not be dismissed.',
    // The code joins these to the value after them, so the trailing space stays.
    place: 'Place: ',
    writtenBy: 'Written by ',
    edited: ' · edited {{date}}',
    lastConfirmed_one: 'Last confirmed {{date}} · {{count}} upvote from other riders',
    lastConfirmed_other: 'Last confirmed {{date}} · {{count}} upvotes from other riders',
    flags: 'Flags',
    flagged: 'Flagged',
    confirmDelete: 'Yes, delete this note',
    keepIt: 'Keep it',
    confirmDismiss_one: 'Yes, dismiss the flag',
    confirmDismiss_other: 'Yes, dismiss all {{count}} flags',
    keepFlags_one: 'Keep it',
    keepFlags_other: 'Keep them',
    dismissFlags: 'Dismiss flags',
  },
}
