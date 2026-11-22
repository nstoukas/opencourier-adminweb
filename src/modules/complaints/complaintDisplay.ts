import type {
  ComplaintAbout,
  ComplaintAdminDto,
  ComplaintCategory,
  ComplaintFiledBy,
  ComplaintStatus,
} from '@/backend-admin-sdk'

// Spec 0052 (row 83): the words for complaints in adminweb, keyed in one place so row 47 (spec 0054)
// can move them into translation files as they are. adminweb has no translation library yet.

export const COMPLAINT_STATUS_TO_HUMAN: Record<ComplaintStatus, string> = {
  AWAITING_REPLY: "Waiting for the rider's reply",
  OPEN: 'Open, to decide',
  DECIDED: 'Decided',
  WITHDRAWN: 'Withdrawn',
}

export const COMPLAINT_ABOUT_TO_HUMAN: Record<ComplaintAbout, string> = {
  RESTAURANT: 'A restaurant',
  CUSTOMER: 'A customer',
  RIDER: 'A rider',
}

export const COMPLAINT_FILED_BY_TO_HUMAN: Record<ComplaintFiledBy, string> = {
  RIDER: 'Rider',
  RESTAURANT: 'Restaurant',
  ADMIN: 'Co-op (on behalf of a caller)',
}

export const COMPLAINT_CATEGORY_TO_HUMAN: Record<ComplaintCategory, string> = {
  LONG_WAIT: 'Long wait',
  FOOD_NOT_READY: 'Food not ready',
  UNSAFE_PACKAGING: 'Unsafe packaging',
  RUDE_STAFF: 'Rude staff',
  ABUSE_OR_THREAT: 'Abuse or a threat',
  UNSAFE_ADDRESS: 'Unsafe address',
  NOT_ANSWERING: 'Not answering',
  LATE: 'Late',
  RUDE: 'Rude',
  FOOD_DAMAGED: 'Food damaged',
  OTHER: 'Something else',
}

// A code this tab does not know (a newer server) reads as the code itself rather than breaking the page.
export const categoryText = (category: string): string =>
  (COMPLAINT_CATEGORY_TO_HUMAN as Record<string, string>)[category] ?? category

// A status this tab does not know reads as the code itself, as with categories.
export const statusText = (status: string): string =>
  (COMPLAINT_STATUS_TO_HUMAN as Record<string, string>)[status] ?? status

// The categories for a complaint about a rider, the only kind an admin files (AC-3).
export const RIDER_CATEGORIES: ComplaintCategory[] = ['LATE', 'RUDE', 'FOOD_DAMAGED', 'OTHER']

// The list's status filter, in the order a representative works through them. "All" sends no filter.
export const COMPLAINT_STATUS_FILTERS: { value: ComplaintStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'To decide' },
  { value: 'AWAITING_REPLY', label: 'Waiting for a reply' },
  { value: 'DECIDED', label: 'Decided' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

export const COMPLAINT_ABOUT_FILTERS: { value: ComplaintAbout | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Anyone' },
  { value: 'RIDER', label: 'A rider' },
  { value: 'RESTAURANT', label: 'A restaurant' },
  { value: 'CUSTOMER', label: 'A customer' },
]

// Who the complaint is about, as one line: the rider's name, else the party.
export function aboutText(complaint: Pick<ComplaintAdminDto, 'about' | 'aboutCourierName' | 'delivery'>): string {
  if (complaint.about === 'RIDER') return complaint.aboutCourierName ?? 'A rider'
  if (complaint.about === 'RESTAURANT') return `${complaint.delivery.pickupName} (restaurant)`
  return "The order's customer"
}

// Who filed it, as one line.
export function filerText(complaint: Pick<ComplaintAdminDto, 'filedBy' | 'filerName'>): string {
  const kind = (COMPLAINT_FILED_BY_TO_HUMAN as Record<string, string>)[complaint.filedBy] ?? complaint.filedBy
  return complaint.filerName ? `${kind}: ${complaint.filerName}` : kind
}

// The backend keeps a complaint, an outcome, a reason and a reply to 1000 characters each.
export const COMPLAINT_TEXT_MAX = 1000

// The sentence the admin writes when a deactivated rider could not be reached (cross check 2).
export const RIDER_COULD_NOT_REPLY = 'The rider could not reply.'
