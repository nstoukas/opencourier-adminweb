// splitRequests: Greek texts, key for key with ../en/splitRequests.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['splitRequests']` makes TypeScript refuse a key missing here or added only here.
export const splitRequests: Translations['splitRequests'] = {
  title: 'Αιτήματα διαχωρισμού',
  description:
    'Διανομείς σε κατάστημα με παραγγελία που δεν χωράει σε ένα κουτί. Ο διανομέας κρατά το πρώτο κουτί· κάθε άλλο κουτί φεύγει ως ξεχωριστή παραγγελία, πληρώνεται ολόκληρο και χρεώνεται στο κατάστημα.',
  loading: 'Φόρτωση αιτημάτων διαχωρισμού…',
  loadFailed: 'Τα αιτήματα διαχωρισμού δεν φόρτωσαν.',
  empty: 'Κανένας διανομέας δεν περιμένει διαχωρισμό.',
  columns: {
    restaurant: 'Κατάστημα',
    rider: 'Διανομέας',
    proposed: 'Πρόταση',
    waiting: 'Αναμονή',
    answer: 'Απάντηση',
  },
  leg: 'Σκέλος {{number}} από {{total}}',
  size: {
    SMALL: 'Μικρή',
    MEDIUM: 'Μεσαία',
    LARGE: 'Μεγάλη',
  },
  legs_one: '{{count}} κουτί: {{list}}',
  legs_other: '{{count}} κουτιά: {{list}}',
  listAnd: '{{first}} και {{last}}',
  sentAs: 'Στάλθηκε ως: {{size}}',
  boxesToConfirm: 'Κουτιά προς επιβεβαίωση',
  box: 'Κουτί {{number}}',
  addBox: 'Προσθήκη κουτιού',
  removeBox: 'Αφαίρεση του τελευταίου κουτιού',
  mayLeave: 'Μπορεί να φύγει από {{time}}',
  splitInto: 'Διαχωρισμός σε {{number}}',
  changeBoxes: 'Αλλαγή κουτιών',
  itFits: 'Χωράει',
  noteLabel: 'Μια πρόταση για τον διανομέα (προαιρετικό)',
  refuse: 'Απόρριψη διαχωρισμού',
  saveFailed: 'Η απάντηση δεν αποθηκεύτηκε. Δοκιμάστε ξανά.',
  badge: {
    countFailed: 'Τα ανοιχτά αιτήματα διαχωρισμού δεν μετρήθηκαν',
    waiting: '{{number}} περιμένουν απάντηση',
  },
}
