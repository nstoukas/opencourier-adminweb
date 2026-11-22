// charges: Greek texts, key for key with ../en/charges.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
// `statement.*` is not a draft: it is spec 0036's Greek statement and CSV, moved here word for word from
// the old src/modules/charges/greek.ts.
import type { Translations } from '../en'

// `: Translations['charges']` makes TypeScript refuse a key missing here or added only here.
export const charges: Translations['charges'] = {
  // "Έξοδα αποστολής", as the statement says, rather than "χρέωση διανομής": on a page called Χρεώσεις
  // that word could read as one of the restaurant's charges.
  deliveryFeeNote: 'Τα έξοδα αποστολής τα πληρώνουν οι πελάτες και δεν εμφανίζονται ποτέ εδώ.',
  title: 'Χρεώσεις',
  loadFailed: 'Δεν φορτώθηκαν οι χρεώσεις.',
  downloadCsv: 'Λήψη CSV',
  previous: 'Προηγούμενος',
  next: 'Επόμενος',
  noChargesIn: 'Καμία χρέωση: {{month}}',
  atMostCharacters: 'Έως {{max}} χαρακτήρες.',
  reason: {
    cancellation: 'Ακύρωση αφού την αποδέχτηκε διανομέας',
    waitingSplit: 'Αναμονή όσο ο συντονισμός χώριζε την παραγγελία',
    waitingMinutes_one: 'Ο διανομέας περίμενε {{count}} λεπτό μετά τη συμφωνημένη ώρα',
    waitingMinutes_other: 'Ο διανομέας περίμενε {{count}} λεπτά μετά τη συμφωνημένη ώρα',
    waiting: 'Ο διανομέας περίμενε μετά τη συμφωνημένη ώρα',
    removal: 'Ο διανομέας αποδεσμεύτηκε από την παραγγελία: {{label}}',
    splitLeg: 'Επιπλέον διανομέας: η παραγγελία δεν χωρούσε στο μέγεθος που δηλώθηκε',
  },
  billedAt: 'Τιμολόγηση {{when}}',
  columns: {
    restaurant: 'Κατάστημα',
    charges: 'Χρεώσεις',
    charged: 'Χρεώθηκαν',
    billed: 'Τιμολογήθηκαν',
    unbilled: 'Προς τιμολόγηση',
    when: 'Πότε',
    order: 'Παραγγελία',
    reason: 'Αιτία',
    amount: 'Ποσό',
  },
  overview: {
    description:
      'Τι χρεώθηκε κάθε κατάστημα για αργές ακυρώσεις, αναμονές και διανομείς που αποδεσμεύτηκαν από παραγγελίες του. Οι μήνες είναι σε ώρα Ελλάδας.',
    monthNav: 'Μήνας',
    earlierUnbilled_one: '{{count}} χρέωση προς τιμολόγηση σε προηγούμενους μήνες:',
    earlierUnbilled_other: '{{count}} χρεώσεις προς τιμολόγηση σε προηγούμενους μήνες:',
  },
  partnerMonth: {
    notAMonth: 'Αυτή η διεύθυνση δεν δείχνει μήνα (ΕΕΕΕ-ΜΜ).',
    description: 'Χρεώσεις: {{month}}, ώρα Ελλάδας.',
    markAsBilled: 'Σήμανση ως τιμολογημένες',
    partnerNotFound: 'Το κατάστημα δεν βρέθηκε.',
    totals: 'Σύνολα',
    lines: 'Γραμμές',
    notBilled: 'Δεν τιμολογήθηκε',
    bills: 'Τιμολογήσεις',
    noBills: 'Καμία τιμολόγηση ακόμα: {{month}}.',
    billSummary_one: 'Από {{name}}, {{when}} · {{count}} γραμμή · {{amounts}}',
    billSummary_other: 'Από {{name}}, {{when}} · {{count}} γραμμές · {{amounts}}',
    undoneBy: 'Αναιρέθηκε από {{name}}, {{when}}: {{reason}}',
    statement: 'Κατάσταση',
    statementLabel: 'Κατάσταση για {{bill}}, ανοίγει σε νέα καρτέλα',
    undo: 'Αναίρεση',
    undoLabel: 'Αναίρεση: {{bill}}',
  },
  markBilled: {
    description:
      'Επιλέξτε τις γραμμές που καλύπτει το τιμολόγιό σας. Όσες αποεπιλέξετε μένουν προς τιμολόγηση για αργότερα.',
    allBilled: 'Όλες οι γραμμές του μήνα έχουν τιμολογηθεί.',
    reference: 'Αριθμός τιμολογίου (προαιρετικό)',
    referenceHint: 'Ο αριθμός του τιμολογίου που στείλατε, για να ταιριάζουν τα δύο.',
    someoneBilled:
      'Δεν τιμολογήθηκε τίποτα: κάποιος άλλος μόλις τιμολόγησε {{names}}. Η λίστα ενημερώθηκε· ελέγξτε την και επιβεβαιώστε ξανά.',
    someoneBilledUnknown:
      'Δεν τιμολογήθηκε τίποτα: κάποιες από αυτές τις γραμμές μόλις τιμολογήθηκαν από άλλον. Η λίστα ενημερώθηκε.',
    saveFailed: 'Η τιμολόγηση δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο.',
    confirm_one: 'Επιβεβαίωση {{count}} γραμμής',
    confirm_other: 'Επιβεβαίωση {{count}} γραμμών',
  },
  undoBill: {
    title: 'Αναίρεση: {{bill}};',
    description_one:
      'Η γραμμή της γίνεται ξανά προς τιμολόγηση. Η τιμολόγηση μένει στο αρχείο ως αναιρεμένη, με τον λόγο σας.',
    description_other:
      'Οι {{count}} γραμμές της γίνονται ξανά προς τιμολόγηση. Η τιμολόγηση μένει στο αρχείο ως αναιρεμένη, με τον λόγο σας.',
    why: 'Λόγος',
    hint: 'Για παράδειγμα: λάθος γραμμές ή ακυρώθηκε το τιμολόγιο.',
    failed: 'Η τιμολόγηση δεν αναιρέθηκε. Δοκιμάστε ξανά σε λίγο.',
    confirm: 'Αναίρεση τιμολόγησης',
  },
  unbilledLine: {
    loadFailed: 'Δεν φορτώθηκαν οι χρεώσεις αυτού του μήνα.',
    none: 'Καμία χρέωση αυτόν τον μήνα',
    noneUnbilled: 'Καμία χρέωση προς τιμολόγηση αυτόν τον μήνα',
    unbilled: 'Προς τιμολόγηση αυτόν τον μήνα: {{amounts}}',
  },
  statementPage: {
    print: 'Εκτύπωση',
    notFound: 'Η τιμολόγηση δεν βρέθηκε.',
    loadFailed: 'Δεν φορτώθηκε η κατάσταση.',
  },
  // Spec 0036's Greek, word for word as greek.ts had it.
  statement: {
    title: 'Κατάσταση χρεώσεων',
    columns: {
      when: 'Ημερομηνία και ώρα',
      order: 'Παραγγελία',
      reason: 'Αιτία',
      amount: 'Ποσό',
    },
    total: 'Σύνολο',
    notATaxDocument: 'Αυτό δεν είναι φορολογικό παραστατικό.',
    customerPaysDelivery: 'Τα έξοδα αποστολής τα πληρώνει ο πελάτης και δεν εμφανίζονται εδώ.',
    undoneBanner: 'Ακυρώθηκε',
    billedAt: 'Χρέωση {{when}}',
    csv: {
      restaurant: 'Κατάστημα',
      when: 'Ημερομηνία και ώρα',
      order: 'Παραγγελία',
      reason: 'Αιτία',
      minutesLate: 'Λεπτά μετά τη συμφωνημένη ώρα',
      amount: 'Ποσό',
      currency: 'Νόμισμα',
      billed: 'Τιμολογήθηκε',
      bill: 'Χρέωση',
      deliveryId: 'Κωδικός διανομής',
    },
    yes: 'ναι',
    no: 'όχι',
    reason: {
      cancellation: 'Ακύρωση αφού διανομέας είχε αποδεχτεί την παραγγελία',
      waitingSplit: 'Αναμονή όσο η διανομή χώριζε την παραγγελία',
      waitingMinutes_one: 'Αναμονή διανομέα, {{count}} λεπτό μετά την ώρα που είχε συμφωνηθεί',
      waitingMinutes_other: 'Αναμονή διανομέα, {{count}} λεπτά μετά την ώρα που είχε συμφωνηθεί',
      waiting: 'Αναμονή διανομέα μετά την ώρα που είχε συμφωνηθεί',
      removal: 'Απομάκρυνση διανομέα από την παραγγελία: {{label}}',
      splitLeg: 'Επιπλέον διανομέας: η παραγγελία δεν χωρούσε στο μέγεθος που δηλώθηκε',
    },
  },
}
