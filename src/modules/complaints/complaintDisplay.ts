import type { TFunction } from 'i18next'
import type { ComplaintAbout, ComplaintAdminDto, ComplaintCategory, ComplaintStatus } from '@/backend-admin-sdk'

// Spec 0052 (row 83): the words for complaints in adminweb. Row 47 (spec 0054) moved them into
// src/i18n/resources/{en,el}/complaints.ts; these helpers take `t` (useTranslation's) and answer in the
// reader's language.

// A code this tab does not know (a newer server) reads as the code itself rather than breaking the page.
// `defaultValue` is what i18next returns when the key does not exist.
export const categoryText = (t: TFunction, category: string): string =>
  t(`complaints.category.${category}`, { defaultValue: category })

// A status this tab does not know reads as the code itself, as with categories.
export const statusText = (t: TFunction, status: string): string =>
  t(`complaints.status.${status}`, { defaultValue: status })

// The categories for a complaint about a rider, the only kind an admin files (AC-3).
export const RIDER_CATEGORIES: ComplaintCategory[] = ['LATE', 'RUDE', 'FOOD_DAMAGED', 'OTHER']

// The list's status filter, in the order a representative works through them. "All" sends no filter.
// Each label is a translation key, translated where the tab is drawn.
export const COMPLAINT_STATUS_FILTERS: { value: ComplaintStatus | 'ALL'; labelKey: string }[] = [
  { value: 'ALL', labelKey: 'complaints.statusFilter.ALL' },
  { value: 'OPEN', labelKey: 'complaints.statusFilter.OPEN' },
  { value: 'AWAITING_REPLY', labelKey: 'complaints.statusFilter.AWAITING_REPLY' },
  { value: 'DECIDED', labelKey: 'complaints.statusFilter.DECIDED' },
  { value: 'WITHDRAWN', labelKey: 'complaints.statusFilter.WITHDRAWN' },
]

export const COMPLAINT_ABOUT_FILTERS: { value: ComplaintAbout | 'ALL'; labelKey: string }[] = [
  { value: 'ALL', labelKey: 'complaints.aboutFilter.ALL' },
  { value: 'RIDER', labelKey: 'complaints.aboutFilter.RIDER' },
  { value: 'RESTAURANT', labelKey: 'complaints.aboutFilter.RESTAURANT' },
  { value: 'CUSTOMER', labelKey: 'complaints.aboutFilter.CUSTOMER' },
]

// Who the complaint is about, as one line: the rider's name, else the party.
export function aboutText(
  t: TFunction,
  complaint: Pick<ComplaintAdminDto, 'about' | 'aboutCourierName' | 'delivery'>
): string {
  if (complaint.about === 'RIDER') return complaint.aboutCourierName ?? t('complaints.aboutRider')
  if (complaint.about === 'RESTAURANT') return t('complaints.aboutRestaurant', { name: complaint.delivery.pickupName })
  return t('complaints.aboutCustomer')
}

// Who filed it, as one line ("Rider: Maria"). A code this tab does not know reads as the code.
export function filerText(t: TFunction, complaint: Pick<ComplaintAdminDto, 'filedBy' | 'filerName'>): string {
  const kind = t(`complaints.filedBy.${complaint.filedBy}`, { defaultValue: complaint.filedBy })
  return complaint.filerName ? `${kind}: ${complaint.filerName}` : kind
}

// The backend keeps a complaint, an outcome, a reason and a reply to 1000 characters each.
export const COMPLAINT_TEXT_MAX = 1000

// The key of the sentence the admin writes when a deactivated rider could not be reached (cross check 2),
// put into the box in the reader's language.
export const RIDER_COULD_NOT_REPLY_KEY = 'complaints.details.riderCouldNotReply'
