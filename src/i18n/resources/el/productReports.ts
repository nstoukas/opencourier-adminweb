// productReports: Greek texts, key for key with ../en/productReports.ts. Drafted by Claude; a Greek speaking member checks
// them before go live (docs/translations/greek-review.md at the workspace root).
import type { Translations } from '../en'

// `: Translations['productReports']` makes TypeScript refuse a key missing here or added only here.
export const productReports: Translations['productReports'] = {
  kind: {
    WRONG_ITEM: 'Λάθος προϊόν',
    MISSING_ITEM: 'Προϊόν που λείπει',
  },
  source: {
    COURIER: 'Διανομέας',
    PARTNER: 'Κατάστημα',
    ADMIN: 'Διαχειριστής',
  },
  row: {
    delivery: 'Παραγγελία',
    from: 'Από ',
    resolved: 'Επιλύθηκε {{date}}',
    resolution: 'Επίλυση',
    resolve: 'Επίλυση',
    resolveFailed: 'Η αναφορά δεν επιλύθηκε.',
  },
  card: {
    title: 'Αναφορές προϊόντων',
    loadFailed: 'Οι αναφορές προϊόντων δεν φορτώθηκαν.',
    none: 'Δεν έχει αναφερθεί κανένα προϊόν για αυτή την παραγγελία.',
    item: 'Προϊόν',
    note: 'Σημείωση',
    nameOrNote: 'Γράψτε το προϊόν ή προσθέστε σημείωση.',
    saveFailed: 'Η αναφορά δεν αποθηκεύτηκε.',
    saveReport: 'Αποθήκευση αναφοράς',
    addReport: 'Προσθήκη αναφοράς',
  },
  page: {
    title: 'Αναφορές προϊόντων',
    description: 'Λάθος προϊόντα ή προϊόντα που λείπουν, όπως τα ανέφεραν διανομείς, καταστήματα ή ο συνεταιρισμός.',
    states: {
      open: 'Ανοιχτές',
      resolved: 'Επιλυμένες',
      all: 'Όλες',
    },
    loadFailed: 'Οι αναφορές προϊόντων δεν φορτώθηκαν.',
    none: 'Καμία αναφορά προϊόντος εδώ.',
    previous: 'Προηγούμενη',
    next: 'Επόμενη',
    pageOf: 'Σελίδα {{page}} από {{pages}}',
  },
}
