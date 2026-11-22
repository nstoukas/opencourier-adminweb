// addressNotes: Greek texts, key for key with ../en/addressNotes.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['addressNotes']` makes TypeScript refuse a key missing here or added only here.
export const addressNotes: Translations['addressNotes'] = {
  page: {
    title: 'Σημειώσεις διευθύνσεων',
    description:
      'Τι έγραψαν οι διανομείς για διάφορα σημεία. Οι σημειώσεις περιγράφουν το σημείο, ποτέ το άτομο· διαγράψτε όσες παραβαίνουν τους κανόνες.',
    loading: 'Φόρτωση',
    flaggedHeading: 'Αναφορές από διανομείς',
    flaggedFailed: 'Οι σημειώσεις με αναφορά δεν φορτώθηκαν.',
    noFlagged: 'Καμία σημείωση με αναφορά.',
    findHeading: 'Αναζήτηση σημείωσης ανά οδό',
    searchLabel: 'Οδός, διεύθυνση ή συντεταγμένες',
    searchFailed: 'Οι σημειώσεις δεν φορτώθηκαν.',
    typePrompt: 'Γράψτε μια οδό, μια διεύθυνση ή συντεταγμένες για να δείτε τις σημειώσεις εκεί.',
    noMatch: 'Καμία σημείωση δεν ταιριάζει.',
    previous: 'Προηγούμενη',
    next: 'Επόμενη',
    pageOf: 'Σελίδα {{page}} από {{pages}}',
  },
  row: {
    aRider: 'Διανομέας',
    anAdmin: 'Διαχειριστής',
    aRestaurant: 'Κατάστημα',
    unknown: 'Άγνωστο',
    deleted: 'Η σημείωση διαγράφηκε.',
    deleteFailed: 'Η σημείωση δεν διαγράφηκε.',
    dismissed: 'Οι αναφορές απορρίφθηκαν. Η σημείωση μένει.',
    dismissFailed: 'Οι αναφορές δεν απορρίφθηκαν.',
    place: 'Σημείο: ',
    writtenBy: 'Συντάκτης: ',
    edited: ' · αλλαγή {{date}}',
    lastConfirmed_one: 'Τελευταία επιβεβαίωση {{date}} · {{count}} θετική ψήφος από άλλους διανομείς',
    lastConfirmed_other: 'Τελευταία επιβεβαίωση {{date}} · {{count}} θετικές ψήφοι από άλλους διανομείς',
    flags: 'Αναφορές',
    flagged: 'Αναφορά',
    confirmDelete: 'Ναι, διαγραφή της σημείωσης',
    keepIt: 'Να μείνει',
    confirmDismiss_one: 'Ναι, απόρριψη της αναφοράς',
    confirmDismiss_other: 'Ναι, απόρριψη και των {{count}} αναφορών',
    keepFlags_one: 'Να μείνει',
    keepFlags_other: 'Να μείνουν',
    dismissFlags: 'Απόρριψη αναφορών',
  },
}
