// Backend enum values as words, in Greek (spec 0054, row 47); key for key with ../en/enums.ts.
// Drafted by Claude; a Greek speaking member checks them before go live.
import type { Translations } from '../en'

export const enums: Translations['enums'] = {
  deliveryStatus: {
    CREATED: 'Δημιουργήθηκε',
    ASSIGNING_COURIER: 'Αναζήτηση διανομέα',
    ACCEPTED: 'Έγινε αποδεκτή',
    DISPATCHED: 'Ο διανομέας ξεκίνησε',
    COURIER_ARRIVED_AT_PICKUP_LOCATION: 'Ο διανομέας στο κατάστημα',
    PICKED_UP: 'Παραλήφθηκε',
    ON_THE_WAY: 'Καθ’ οδόν',
    COURIER_ARRIVED_AT_DROPOFF_LOCATION: 'Ο διανομέας στον πελάτη',
    DROPPED_OFF: 'Παραδόθηκε',
    CANCELED: 'Ακυρώθηκε',
    FAILED: 'Απέτυχε',
  },
  removalRequestStatus: {
    OPEN: 'Περιμένει τον συντονισμό',
    APPROVED: 'Εγκρίθηκε',
    DECLINED: 'Απορρίφθηκε',
    WITHDRAWN: 'Το απέσυρε ο διανομέας',
    CLOSED: 'Έκλεισε: η παραγγελία τελείωσε ή άλλαξε διανομέα πριν από την απάντηση',
  },
  paymentStatus: {
    CANCELED: 'Ακυρώθηκε',
    REQUIRES_CONFIRMATION: 'Χρειάζεται επιβεβαίωση',
    REQUIRES_CAPTURE: 'Περιμένει είσπραξη',
    PROCESSING: 'Σε επεξεργασία',
    REQUIRES_ACTION: 'Χρειάζεται ενέργεια του πελάτη',
    REQUIRES_PAYMENT_METHOD: 'Λείπει έγκυρος τρόπος πληρωμής',
    SUCCEEDED: 'Ολοκληρώθηκε',
  },
  courierStatus: {
    ONLINE: 'Σε σύνδεση',
    OFFLINE: 'Εκτός σύνδεσης',
    LAST_CALL: 'Τελευταία παραγγελία',
  },
  eventActor: {
    COURIER: 'Διανομέας',
    ADMIN: 'Διαχειριστής',
    PARTNER: 'Κατάστημα',
    SYSTEM: 'Σύστημα',
  },
  eventSource: {
    OPENCOURIER: 'OpenCourier',
    PARTNER_APP: 'Εφαρμογή καταστήματος',
  },
  deliveryIssueReason: {
    WRONG_ADDRESS: 'Λάθος διεύθυνση',
    NO_SIGNAL: 'Χωρίς ίντερνετ, GPS ή σήμα',
    ORDER_HANDED: 'Η παραγγελία δόθηκε στον πελάτη',
    FOOD_NOT_READY: 'Δηλώθηκε έτοιμη αλλά δεν ήταν',
    OTHER: 'Άλλο',
  },
  courierMatcherType: {
    NEAREST_COURIER: 'Πλησιέστερος διανομέας',
    COURIER_SENIORITY: 'Αρχαιότητα διανομέα',
    STATIC: 'Σταθερός διανομέας (για δοκιμές)',
    FAIRNESS: 'Δικαιοσύνη (βάρη του συνεταιρισμού)',
  },
  courierCompensationType: {
    FROM_QUOTE_FROM: 'Απλή (ο διανομέας παίρνει τη βασική χρέωση της τιμής συν τη χρέωση απόστασης)',
  },
  currency: {
    USD: 'USD (δολάριο ΗΠΑ)',
    EUR: 'EUR (ευρώ)',
  },
  deliveryDurationType: {
    SIMPLE: 'Απλή (απόσταση × 2)',
    OSRM: 'Διάρκεια διαδρομής OSRM (προφίλ μοτοποδηλάτου)',
  },
  distanceUnit: {
    KILOMETERS: 'Χιλιόμετρα',
    MILES: 'Μίλια',
  },
  geoCalculationType: {
    HAVERSINE: 'Απόσταση Haversine (σε ευθεία)',
    GOOGLE_MATRIX_API: 'Google Matrix API',
    RANDOM: 'Τυχαία απόσταση (για δοκιμές)',
    OSRM: 'Οδική διαδρομή OSRM (προφίλ μοτοποδηλάτου)',
  },
  quoteCalculationType: {
    BY_DISTANCE: 'Με βάση την απόσταση',
    SURGE: 'Δυναμική τιμολόγηση',
    // Row 173: η προειδοποίηση του backend· αυτή η επιλογή κάνει τυχαία την αμοιβή του διανομέα.
    CUSTOM: '⚠ Τυχαίες τιμές, ΜΟΝΟ ΓΙΑ ΔΟΚΙΜΕΣ (αγνοεί την απόσταση· η αμοιβή του διανομέα γίνεται τυχαία)',
  },
  quoteToDeliveryConversionType: {
    SIMPLE: 'Μόνο έλεγχος απόκλισης',
  },
  dietaryRestriction: {
    NONE: 'Κανένας',
    VEGAN: 'Vegan',
    VEGETARIAN: 'Χορτοφαγικό',
    HALAL: 'Halal',
    KOSHER: 'Kosher',
    GLUTEN_FREE: 'Χωρίς γλουτένη',
    LACTOSE_FREE: 'Χωρίς λακτόζη',
    NUT_FREE: 'Χωρίς ξηρούς καρπούς',
    SEAFOOD_FREE: 'Χωρίς θαλασσινά',
    OTHER: 'Άλλο',
  },
}
