// layout: Greek texts, key for key with ../en/layout.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['layout']` makes TypeScript refuse a key missing here or added only here.
export const layout: Translations['layout'] = {
  skipToContent: 'Μετάβαση στο περιεχόμενο',
  mainNav: 'Κύριο μενού',
  signOut: 'Αποσύνδεση',
  navGroup: {
    runTheDay: 'Η μέρα',
    people: 'Άνθρωποι',
    coop: 'Συνεταιρισμός',
  },
  nav: {
    dispatch: 'Συντονισμός',
    deliveries: 'Παραγγελίες',
    messages: 'Μηνύματα',
    sos: 'SOS',
    productReports: 'Αναφορές προϊόντων',
    splitRequests: 'Αιτήματα διαχωρισμού',
    couriers: 'Διανομείς',
    restaurants: 'Καταστήματα',
    settings: 'Ρυθμίσεις',
    shiftSlots: 'Βάρδιες',
    charges: 'Χρεώσεις',
    reviews: 'Επανεξετάσεις',
    complaints: 'Παράπονα',
    addressNotes: 'Σημειώσεις διευθύνσεων',
    timeWorked: 'Χρόνος εργασίας',
  },
}
