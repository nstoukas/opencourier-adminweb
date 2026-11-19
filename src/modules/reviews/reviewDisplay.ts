import type { ReviewOutcome, ReviewRequestStatus, ReviewTopic } from '@/backend-admin-sdk'

// Spec 0038: the words the Reviews page uses. Plain functions, so each rule can be tested on its own.

export const REVIEW_TOPIC_TO_HUMAN: Record<ReviewTopic, string> = {
  OFFER: 'An offer',
  PAY: 'Pay',
  OTHER: 'Something else',
}

export const REVIEW_OUTCOME_TO_HUMAN: Record<ReviewOutcome, string> = {
  STANDS: 'The decision stands',
  CHANGED: 'Changed and put right',
}

export const REVIEW_TABS: { value: ReviewRequestStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

// The same limit as the backend's `answer` column.
export const REVIEW_ANSWER_MAX = 2000

const DAY_MS = 24 * 60 * 60 * 1000

// "3 days left", "1 day left", or "Overdue". Whole 24 hour periods until the due date, rounded up,
// so a request due in 2 hours reads "1 day left". `overdue` comes from the server, which decides it.
export function dueText(dueAt: string, overdue: boolean, now: Date = new Date()): string {
  if (overdue) return 'Overdue'
  const days = Math.max(1, Math.ceil((new Date(dueAt).getTime() - now.getTime()) / DAY_MS))
  return days === 1 ? '1 day left' : `${days} days left`
}

// "1.50" or "1,50" euro as 150 cents. Null for anything that is not a positive amount with at most
// two decimals (the backend checks again, and checks the co-op's cap).
export function parseCorrectionCents(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const cents = Math.round(Number(trimmed) * 100)
  return cents > 0 ? cents : null
}
