// auth: Greek texts, key for key with ../en/auth.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['auth']` makes TypeScript refuse a key missing here or added only here.
export const auth: Translations['auth'] = {
  pageTitle: 'Σύνδεση · OpenCourier Διαχείριση',
  heading: 'Διαχείριση συνεταιρισμού',
  description: 'Συνδεθείτε με το email και τον κωδικό πρόσβασης που σας έδωσε ο συνεταιρισμός.',
  email: 'Email',
  password: 'Κωδικός πρόσβασης',
  submit: 'Σύνδεση',
  submitting: 'Σύνδεση…',
  failedTitle: 'Η σύνδεση δεν έγινε',
  enterBoth: 'Συμπληρώστε το email και τον κωδικό πρόσβασης και πατήστε Σύνδεση.',
  wrongLogin: 'Το email και ο κωδικός πρόσβασης δεν ταιριάζουν. Ελέγξτε για λάθη και δοκιμάστε ξανά.',
  tooMany: 'Πάρα πολλές προσπάθειες στη σειρά. Περιμένετε ένα λεπτό και δοκιμάστε ξανά.',
  noAnswer: 'Ο διακομιστής του συνεταιρισμού δεν απάντησε. Ελέγξτε τη σύνδεσή σας στο διαδίκτυο και δοκιμάστε ξανά σε ένα λεπτό.',
}
