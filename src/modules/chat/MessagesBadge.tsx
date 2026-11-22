import { useEffect, useRef } from 'react'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import { useGetChatUnreadCountQuery } from '@/api/chatApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useChatLive } from './ChatLive'
import { playChatSound } from './chatSound'

// A backstop to the live connection: the count is asked again every 30 s while the tab is visible (AC-8).
export const UNREAD_COUNT_POLL_MS = 30_000

// The sidebar's count of threads with a message dispatch has not read (AC-2, AC-9). A count of threads,
// shared by every admin, never a count of any one person's messages.
export function MessagesBadge() {
  const { t } = useTranslation()
  const pageVisible = usePageVisible()
  const live = useChatLive()
  const { data } = useGetChatUnreadCountQuery(undefined, {
    pollingInterval: pageVisible ? UNREAD_COUNT_POLL_MS : 0,
  })
  const count = data?.count ?? 0

  // Without the live connection, the sound comes from here: once when the count goes up (AC-9).
  // With it, ChatLive plays it as each message arrives, so this stays quiet to never play it twice.
  const previous = useRef<number | null>(null)
  useEffect(() => {
    if (data === undefined) return
    if (!live && previous.current !== null && count > previous.current) playChatSound()
    previous.current = count
  }, [count, data, live])

  if (count === 0) return null
  return (
    <span
      className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold leading-none text-destructive-foreground"
      aria-label={t('chat.badge.unread', { number: count })}
    >
      {count}
    </span>
  )
}
