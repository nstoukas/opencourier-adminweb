import { useEffect, useRef } from 'react'
import { useGetSplitRequestCountQuery } from '@/api/splitRequestApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { playChatSound } from '@/modules/chat/chatSound'

// A rider waits at the restaurant, paid by the minute, until someone answers: asked every 15 s.
export const SPLIT_COUNT_POLL_MS = 15_000

// Spec 0047 (AC-4, cross check 14): the sidebar's count of open split requests, like Reviews' count, and the
// chat's quiet sound when it goes up, so a rider flagging an order is not missed for ten minutes. One count
// for the whole co-op, never per rider (binding value 5).
export function SplitRequestsBadge() {
  const pageVisible = usePageVisible()
  const { data, isError } = useGetSplitRequestCountQuery(undefined, {
    pollingInterval: pageVisible ? SPLIT_COUNT_POLL_MS : 0,
  })
  const open = data?.open ?? 0
  // The count last seen, so the sound plays only when it rises (not on the first load).
  const lastSeen = useRef<number | null>(null)
  useEffect(() => {
    if (!data) return
    if (lastSeen.current !== null && data.open > lastSeen.current) playChatSound()
    lastSeen.current = data.open
  }, [data])

  if (!data && isError) {
    return (
      <span
        role="img"
        aria-label="Open split requests could not be counted"
        className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-xs font-semibold leading-none text-secondary-foreground"
        title="Open split requests could not be counted"
      >
        ?
      </span>
    )
  }
  if (open === 0) return null
  const label = `${open} waiting for an answer`
  // Always red: a rider is standing at a restaurant until someone answers.
  return (
    <span
      className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold leading-none text-destructive-foreground"
      role="img"
      aria-label={label}
      title={label}
    >
      {open}
    </span>
  )
}
