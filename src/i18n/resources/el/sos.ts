// sos: Greek texts, key for key with ../en/sos.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['sos']` makes TypeScript refuse a key missing here or added only here.
export const sos: Translations['sos'] = {
  titleNamed: 'SOS: {{name}}',
  outcome: {
    RIDER_SAFE: 'Ο διανομέας είναι ασφαλής',
    HELP_ARRIVED: 'Έφτασε βοήθεια',
    FALSE_ALARM: 'Ψευδής συναγερμός',
    OTHER: 'Άλλο',
  },
  state: {
    ACTIVE: 'Ενεργό',
    AWAITING_CLOSE: 'Αναμένει κλείσιμο',
    CLOSED: 'Έκλεισε',
  },
  ago: {
    justNow: 'μόλις τώρα',
    minutes: 'πριν από {{minutes}} λ.',
    hours: 'πριν από {{hours}} ώρ.',
    hoursMinutes: 'πριν από {{hours}} ώρ. {{minutes}} λ.',
  },
  banner: {
    active: 'SOS: {{name}}, {{ago}}',
    falseAlarm: '{{name}}: δήλωσε ψευδή συναγερμό, αναμένει κλείσιμο',
    safe: '{{name}}: δήλωσε ότι είναι ασφαλής, αναμένει κλείσιμο',
    label: 'SOS διανομέων',
  },
  riderEnd: {
    safe: 'Ασφαλής: {{time}}',
    falseAlarm: 'Ψευδής συναγερμός: {{time}}',
  },
  anAdmin: 'διαχειριστής',
  notificationBody: 'Ένας διανομέας χρειάζεται βοήθεια. Ανοίξτε τη διαχείριση για να δείτε πού βρίσκεται.',
  alerts: {
    unreachableSince:
      'Καμία επικοινωνία με τον διακομιστή, τελευταία: {{time}}. Οι ειδοποιήσεις SOS μπορεί να καθυστερούν.',
    unreachable: 'Ο διακομιστής δεν απαντά. Οι ειδοποιήσεις SOS μπορεί να καθυστερούν.',
    blocked:
      'Οι ειδοποιήσεις είναι μπλοκαρισμένες σε αυτό το πρόγραμμα περιήγησης: επιτρέψτε τες στις ρυθμίσεις του ιστότοπου. Η μπάρα και ο ήχος λειτουργούν.',
    off: 'Ειδοποιήσεις SOS ανενεργές',
    soundOn: 'Ενεργοποίηση ήχου SOS',
    enable: 'Ενεργοποίηση ειδοποιήσεων SOS',
  },
  list: {
    description:
      'Η θέση ενός διανομέα κοινοποιείται μόνο όσο το SOS του είναι ενεργό και διαγράφεται μετά το διάστημα που ορίζεται στις Ρυθμίσεις.',
    openNow: 'Ανοιχτά τώρα',
    unreachable: 'Ο διακομιστής δεν απαντά, οπότε η λίστα μπορεί να μην είναι ενημερωμένη. Ζητείται ξανά κάθε 10 δευτ.',
    none: 'Κανένας διανομέας δεν έχει ανοιχτό SOS.',
    closed: 'Κλειστά',
    state: 'Κατάσταση',
    riderEnd: 'Ασφαλής ή ψευδής συναγερμός',
    action: 'Ενέργεια',
  },
  details: {
    loadFailed: 'Αυτό το SOS δεν φορτώθηκε.',
    back: 'Πίσω στα SOS',
    close: 'Κλείσιμο SOS',
    trailTitle: 'Πού βρισκόταν ο διανομέας',
    positions_one: '{{count}} θέση από {{from}} έως {{to}}.',
    positions_other: '{{count}} θέσεις από {{from}} έως {{to}}.',
    updates: 'Ενημερώνεται κάθε 10 δευτ. όσο το SOS είναι ενεργό.',
    pointsDeleted: 'Τα σημεία θέσης διαγράφηκαν ({{time}}).',
    noPoints: 'Δεν καταγράφηκαν σημεία θέσης.',
    lastPosition: 'Τελευταία θέση, {{time}}',
    record: 'Καταγραφή',
    rider: 'Διανομέας',
    started: 'Έναρξη',
    jobHeld: 'Παραγγελία σε εξέλιξη',
    openDelivery: 'Άνοιγμα παραγγελίας',
    riderEnded: 'Τέλος από τον διανομέα',
    closed: 'Κλείσιμο',
    closedBy: 'Έκλεισε από',
    outcome: 'Έκβαση',
    note: 'Σημείωση',
  },
  contact: {
    title: 'Επαφή έκτακτης ανάγκης',
    none: 'Χωρίς επαφή έκτακτης ανάγκης',
    failed: 'Η επαφή έκτακτης ανάγκης δεν φορτώθηκε.',
    openRider: 'Άνοιγμα σελίδας διανομέα',
  },
  close: {
    title: 'Κλείσιμο SOS: {{name}}',
    activeDescription:
      'Με το κλείσιμο, το τηλέφωνο του διανομέα σταματά να στέλνει τη θέση του και μπορεί να λάβει ξανά προτάσεις.',
    endedDescription: 'Ο διανομέας το έχει ήδη τερματίσει. Το κλείσιμο καταγράφει τι συνέβη.',
    whatHappened: 'Τι συνέβη',
    choose: 'Επιλέξτε…',
    note: 'Σημείωση (προαιρετικά)',
    done: 'Το SOS έκλεισε.',
    failed: 'Το SOS δεν έκλεισε. Δοκιμάστε ξανά.',
  },
}
