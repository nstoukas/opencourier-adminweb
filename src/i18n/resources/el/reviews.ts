// reviews: Greek texts, key for key with ../en/reviews.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['reviews']` makes TypeScript refuse a key missing here or added only here.
export const reviews: Translations['reviews'] = {
  title: 'Επανεξετάσεις',
  description:
    'Ένας διανομέας μπορεί να ζητήσει από έναν άνθρωπο να ξανακοιτάξει κάθε απόφαση της εφαρμογής για τη δουλειά του. Κάθε αίτημα θέλει γραπτή απάντηση έως την προθεσμία του.',
  topic: {
    OFFER: 'Μια πρόταση',
    PAY: 'Αμοιβή',
    OTHER: 'Κάτι άλλο',
  },
  outcome: {
    STANDS: 'Η απόφαση ισχύει',
    CHANGED: 'Άλλαξε και διορθώθηκε',
  },
  tabs: {
    OPEN: 'Ανοιχτά',
    ANSWERED: 'Απαντημένα',
    WITHDRAWN: 'Αποσυρμένα',
  },
  overdue: 'Εκπρόθεσμο',
  daysLeft_one: 'Απομένει {{count}} ημέρα',
  daysLeft_other: 'Απομένουν {{count}} ημέρες',
  list: {
    loadFailed: 'Δεν φορτώθηκαν τα αιτήματα επανεξέτασης. Η λίστα παρακάτω μπορεί να μην είναι ενημερωμένη.',
    noneOpen: 'Κανένα αίτημα δεν περιμένει απάντηση.',
    noneYet: 'Κανένα ακόμα.',
    due: 'Προθεσμία',
    answered: 'Απαντήθηκε',
    withdrawn: 'Αποσύρθηκε',
    rider: 'Διανομέας',
    about: 'Θέμα',
    delivery: 'Παραγγελία',
    request: 'Αίτημα',
    requestAndAnswer: 'Αίτημα και απάντηση',
    answer: 'Απάντηση',
    dueAt: 'Προθεσμία: {{when}}',
    sentAt: 'Στάλθηκε: {{when}}',
    general: 'Γενικό',
    payCorrection: 'Διόρθωση αμοιβής: {{amount}}',
    answeredBy: 'Απάντησε: {{name}}',
    removedAdmin: 'διαχειριστής που έχει αφαιρεθεί',
    previous: 'Προηγούμενη',
    next: 'Επόμενη',
    page: 'Σελίδα {{current}} από {{total}}',
  },
  badge: {
    notCounted: 'Δεν μετρήθηκαν τα ανοιχτά αιτήματα επανεξέτασης',
    open: 'Ανοιχτά: {{open}}',
    openOverdue: 'Ανοιχτά: {{open}}, εκπρόθεσμα: {{overdue}}',
  },
  answer: {
    button: 'Απάντηση',
    title: 'Απάντηση σε {{name}}',
    description: 'Ο διανομέας διαβάζει την απάντησή σας στην εφαρμογή. Τίποτα δεν αποφασίζεται πριν τη στείλετε.',
    outcome: 'Απόφαση',
    reason: 'Αιτιολόγηση',
    reasonHint: 'Εξηγήστε γιατί, με λόγια που καταλαβαίνει ο διανομέας. Έως {{max}} χαρακτήρες.',
    correction: 'Διόρθωση αμοιβής σε ευρώ (προαιρετικό)',
    correctionHint: 'Προστίθεται στην αμοιβή του/της {{name}} για αυτή την παραγγελία, σήμερα. Μόνο προσθέτει, ποτέ δεν αφαιρεί.',
    correctionHintCap:
      'Προστίθεται στην αμοιβή του/της {{name}} για αυτή την παραγγελία, σήμερα. Μόνο προσθέτει, ποτέ δεν αφαιρεί, έως {{max}}.',
    correctionInvalid: 'Γράψτε ποσό σε ευρώ πάνω από 0, π.χ. 1,50.',
    capNotLoaded: 'Το όριο του συνεταιρισμού δεν έχει φορτωθεί ακόμα. Δοκιμάστε ξανά σε λίγο.',
    overCap: 'Έως {{max}}, το όριο του συνεταιρισμού.',
    notNow: 'Όχι τώρα',
    sending: 'Αποστολή…',
    next: 'Επόμενο',
    send: 'Αποστολή απάντησης',
    confirmTitle: 'Προσθήκη {{amount}} στην αμοιβή του διανομέα;',
    confirmBody:
      'Ο/Η {{name}} πληρώνεται {{amount}} επιπλέον για αυτή την παραγγελία, στις σημερινές αποδοχές. Καταγράφεται στην παραγγελία και δεν αναιρείται.',
    sendAndAdd: 'Αποστολή και προσθήκη {{amount}}',
    sent: 'Η απάντηση στάλθηκε',
    sentDescription: 'Ο/Η {{name}} μπορεί να τη διαβάσει στην εφαρμογή.',
    notSent: 'Δεν στάλθηκε',
    failed: 'Η απάντηση δεν στάλθηκε. Δοκιμάστε ξανά σε λίγο.',
  },
}
