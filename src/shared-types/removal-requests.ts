// Private copy of the backend's EnumRemovalRequestStatus (prisma/schema.prisma, spec 0035).
// A new status there needs a line here and in the label map below.
export enum EnumRemovalRequestStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
  CLOSED = 'CLOSED',
}

// What the admin reads for each status on the delivery page.
export const REMOVAL_REQUEST_STATUS_TO_HUMAN: Record<EnumRemovalRequestStatus, string> = {
  OPEN: 'Waiting for dispatch',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn by the rider',
  CLOSED: 'Closed: the order ended or changed rider before an answer',
}
