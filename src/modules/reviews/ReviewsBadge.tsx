import { useTranslation } from 'react-i18next'
import { useGetReviewRequestCountQuery } from '@/api/reviewRequestApi'
import { usePageVisible } from '@/hooks/usePageVisible'

export const REVIEW_COUNT_POLL_MS = 30_000

// Spec 0038 (AC-5): the sidebar's count of open review requests, red while any is overdue. One count
// for the whole co-op, never per rider (binding value 5). Asked again every 30 s while the tab is visible.
export function ReviewsBadge() {
  const pageVisible = usePageVisible()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { data, isError } = useGetReviewRequestCountQuery(undefined, {
    pollingInterval: pageVisible ? REVIEW_COUNT_POLL_MS : 0,
  })
  const open = data?.open ?? 0
  const overdue = data?.overdue ?? 0

  // A count that never loaded is not "none open": say it could not be counted.
  if (!data && isError) {
    return (
      <span
        role="img"
        aria-label={t('reviews.badge.notCounted')}
        className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-xs font-semibold leading-none text-secondary-foreground"
        title={t('reviews.badge.notCounted')}
      >
        {'?'}
      </span>
    )
  }
  if (open === 0) return null
  const label = overdue > 0 ? t('reviews.badge.openOverdue', { open, overdue }) : t('reviews.badge.open', { open })
  // role="img" makes screen readers read the label (on a plain span it is often skipped), and an
  // overdue count shows "!" as well as red, so it is not told by colour alone.
  return (
    <span
      className={
        overdue > 0
          ? 'ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold leading-none text-destructive-foreground'
          : 'ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-xs font-semibold leading-none text-secondary-foreground'
      }
      role="img"
      aria-label={label}
      title={label}
    >
      {open}
      {overdue > 0 ? '!' : ''}
    </span>
  )
}
