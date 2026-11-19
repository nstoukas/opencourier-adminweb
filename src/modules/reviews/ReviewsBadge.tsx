import { useGetReviewRequestCountQuery } from '@/api/reviewRequestApi'
import { usePageVisible } from '@/hooks/usePageVisible'

export const REVIEW_COUNT_POLL_MS = 30_000

// Spec 0038 (AC-5): the sidebar's count of open review requests, red while any is overdue. One count
// for the whole co-op, never per rider (binding value 5). Asked again every 30 s while the tab is visible.
export function ReviewsBadge() {
  const pageVisible = usePageVisible()
  const { data } = useGetReviewRequestCountQuery(undefined, {
    pollingInterval: pageVisible ? REVIEW_COUNT_POLL_MS : 0,
  })
  const open = data?.open ?? 0
  const overdue = data?.overdue ?? 0

  if (open === 0) return null
  const label = overdue > 0 ? `${open} open, ${overdue} overdue` : `${open} open`
  return (
    <span
      className={
        overdue > 0
          ? 'ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold leading-none text-destructive-foreground'
          : 'ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-xs font-semibold leading-none text-secondary-foreground'
      }
      aria-label={label}
      title={label}
    >
      {open}
    </span>
  )
}
