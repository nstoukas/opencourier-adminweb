// chat: Greek texts, key for key with ../en/chat.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['chat']` makes TypeScript refuse a key missing here or added only here.
export const chat: Translations['chat'] = {
  page: {
    title: 'Μηνύματα',
    conversationsLabel: 'Συνομιλίες',
    conversationLabel: 'Συνομιλία',
    choose:
      'Επιλέξτε μια συνομιλία για να τη διαβάσετε και να απαντήσετε. Για νέα, πατήστε «Μήνυμα» στη σελίδα ενός διανομέα ή ενός καταστήματος.',
  },
  role: {
    COURIER: 'Διανομέας',
    PARTNER: 'Κατάστημα',
  },
  list: {
    searchLabel: 'Αναζήτηση συνομιλιών',
    searchPlaceholder: 'Όνομα ή αρ. παραγγελίας',
    tabs: {
      UNREAD: 'Μη αναγνωσμένα',
      COURIERS: 'Διανομείς',
      RESTAURANTS: 'Καταστήματα',
      ALL: 'Όλα',
    },
    empty: {
      UNREAD: 'Δεν περιμένει τίποτα. Όλα τα μηνύματα έχουν διαβαστεί.',
      COURIERS: 'Καμία συνομιλία με διανομείς ακόμη.',
      RESTAURANTS: 'Καμία συνομιλία με καταστήματα ακόμη.',
      ALL: 'Καμία συνομιλία ακόμη. Όταν ένας διανομέας ή ένα κατάστημα γράψει στον συντονισμό, εμφανίζεται εδώ.',
    },
    noMatch: 'Καμία συνομιλία δεν ταιριάζει με «{{search}}».',
    unreachable: 'Οι συνομιλίες δεν είναι διαθέσιμες αυτή τη στιγμή. Θα φορτώσουν ξανά μόνες τους.',
    loading: 'Φόρτωση συνομιλιών…',
    newer: 'Νεότερες',
    older: 'Παλαιότερες',
    page: 'Σελίδα {{current}} από {{total}}',
    you: 'Εσείς: {{body}}',
    unread: 'Μη αναγνωσμένο',
  },
  conversation: {
    notShown: 'Αυτή η συνομιλία δεν μπορεί να εμφανιστεί. Ίσως δεν υπάρχει ή ο διακομιστής δεν απαντά.',
    backToMessages: 'Πίσω στα μηνύματα',
    loading: 'Φόρτωση της συνομιλίας…',
    newMessage: 'Νέο μήνυμα από {{name}}, {{time}}',
    them: 'τον συνομιλητή',
    unreachable: 'Τα μηνύματα δεν είναι διαθέσιμα αυτή τη στιγμή. Θα φορτώσουν ξανά μόνα τους.',
    showEarlier: 'Παλαιότερα μηνύματα',
    empty: 'Δεν υπάρχουν μηνύματα ακόμη. Γράψτε το πρώτο παρακάτω.',
    messagesWith: 'Μηνύματα με {{name}}',
    retry: 'Δεν στάλθηκε, πατήστε για νέα προσπάθεια',
    sending: 'Αποστολή…',
    backToAll: 'Πίσω σε όλες τις συνομιλίες',
    call: 'Κλήση: {{name}}',
    offline:
      '{{name}}: εκτός σύνδεσης. Το μήνυμα περιμένει μέχρι να ανοίξει ξανά την εφαρμογή, χωρίς ειδοποίηση. Τηλεφωνήστε αν δεν μπορεί να περιμένει.',
    activeDeliveries: 'Ενεργές παραγγελίες',
    openDelivery: 'Άνοιγμα παραγγελίας',
    more: 'και {{number}} ακόμη',
    dispatch: 'Συντονισμός',
    sent: 'Στάλθηκε',
  },
  composer: {
    quickReplies: 'Έτοιμες απαντήσεις',
    messageTo: 'Μήνυμα προς {{name}}',
    placeholder: 'Γράψτε μήνυμα προς {{name}}',
    hint: 'Μόνο κείμενο. Το Enter στέλνει, το Shift και Enter αλλάζει γραμμή.',
    send: 'Αποστολή',
  },
  messageButton: {
    label: 'Μήνυμα',
    openFailed: 'Δεν άνοιξε η συνομιλία με {{name}}',
    noLogin: 'Αυτό το κατάστημα δεν έχει λογαριασμό σύνδεσης, οπότε δεν θα μπορούσε να διαβάσει απάντηση.',
  },
  badge: {
    unread: '{{number}} μη αναγνωσμένες',
  },
}
