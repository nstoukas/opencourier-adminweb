import type { TFunction } from 'i18next'
import type { ReviewOutcome, ReviewRequestStatus, ReviewTopic } from '@/backend-admin-sdk'

// Spec 0038: the words the Reviews page uses. Plain functions, so each rule can be tested on its own.
// The words live in src/i18n/resources/{en,el}/reviews.ts (spec 0054); a helper takes `t`
// (useTranslation's) and answers in the reader's language.

// What a request is about. A code this tab does not know reads as the code itself.
export const topicText = (t: TFunction, topic: ReviewTopic | string): string =>
  t(`reviews.topic.${topic}`, { defaultValue: topic })

// An answer's outcome. A code this tab does not know reads as the code itself.
export const outcomeText = (t: TFunction, outcome: ReviewOutcome | string): string =>
  t(`reviews.outcome.${outcome}`, { defaultValue: outcome })

// The page's tabs; each label is a translation key, translated where the tab is drawn.
export const REVIEW_TABS: { value: ReviewRequestStatus; labelKey: string }[] = [
  { value: 'OPEN', labelKey: 'reviews.tabs.OPEN' },
  { value: 'ANSWERED', labelKey: 'reviews.tabs.ANSWERED' },
  { value: 'WITHDRAWN', labelKey: 'reviews.tabs.WITHDRAWN' },
]

// The same limit as the backend's `answer` column.
export const REVIEW_ANSWER_MAX = 2000

const DAY_MS = 24 * 60 * 60 * 1000

// "3 days left", "1 day left", or "Overdue". Whole 24 hour periods until the due date, rounded up,
// so a request due in 2 hours reads "1 day left". `overdue` comes from the server, which decides it.
export function dueText(t: TFunction, dueAt: string, overdue: boolean, now: Date = new Date()): string {
  if (overdue) return t('reviews.overdue')
  const days = Math.max(1, Math.ceil((new Date(dueAt).getTime() - now.getTime()) / DAY_MS))
  return t('reviews.daysLeft', { count: days })
}

// "1.50" or "1,50" euro as 150 cents. Null for anything that is not a positive amount with at most
// two decimals (the backend checks again, and checks the co-op's cap).
export function parseCorrectionCents(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const cents = Math.round(Number(trimmed) * 100)
  return cents > 0 ? cents : null
}
