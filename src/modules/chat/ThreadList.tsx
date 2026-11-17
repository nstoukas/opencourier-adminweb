import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { ChatTab, ChatThreadRowAdminDto } from '../../backend-admin-sdk'
import { useGetChatThreadsQuery, useGetChatUnreadCountQuery } from '@/api/chatApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { Avatar, AvatarFallback, Button, Input, Tabs, TabsList, TabsTrigger } from '../../admin-web-components'
import { cn } from '../../ui-shared-utils'
import { useChatLive } from './ChatLive'
import { initials, orderLabel, roleLabel, threadTime } from './chatDisplay'

// Without the live connection the list refreshes on this beat while the tab is visible (AC-8).
export const THREAD_LIST_POLL_MS = 30_000
const SEARCH_DELAY_MS = 300

const TABS: { value: ChatTab; label: string }[] = [
  { value: 'UNREAD', label: 'Unread' },
  { value: 'COURIERS', label: 'Couriers' },
  { value: 'RESTAURANTS', label: 'Restaurants' },
  { value: 'ALL', label: 'All' },
]

const EMPTY_WORDS: Record<ChatTab, string> = {
  UNREAD: 'Nothing waiting. Every message has been read.',
  COURIERS: 'No conversations with couriers yet.',
  RESTAURANTS: 'No conversations with restaurants yet.',
  ALL: 'No conversations yet. A courier or restaurant who writes to dispatch shows up here.',
}

// AC-2: the inbox, newest first, 50 a page. Search by a name, a rider's phone or an order number.
export function ThreadList({ activeThreadId }: { activeThreadId: string | null }) {
  const pageVisible = usePageVisible()
  const live = useChatLive()
  const [tab, setTab] = useState<ChatTab>('ALL')
  const [typed, setTyped] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Ask the server once typing pauses, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim())
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [typed])

  const { data, isLoading, isError } = useGetChatThreadsQuery(
    { tab, search: search || undefined, page },
    { pollingInterval: !live && pageVisible ? THREAD_LIST_POLL_MS : 0 }
  )
  const { data: unread } = useGetChatUnreadCountQuery()
  const unreadCount = unread?.count ?? 0
  const threads = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search conversations"
            placeholder="Name or order #"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as ChatTab)
            setPage(1)
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="gap-1.5">
                {item.label}
                {item.value === 'UNREAD' && unreadCount > 0 ? (
                  <span className="rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">{unreadCount}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isError ? (
          <p role="status" className="p-4 text-sm text-destructive">
            Conversations can&apos;t be reached right now. They will load again on their own.
          </p>
        ) : null}
        {isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p> : null}
        {!isLoading && !isError && threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{search ? `No conversation matches “${search}”.` : EMPTY_WORDS[tab]}</p>
        ) : null}
        <ul aria-label="Conversations">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} active={thread.id === activeThreadId} />
          ))}
        </ul>
        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 p-4 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={!pagination.prevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Newer
            </Button>
            <span>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!pagination.nextPage} onClick={() => setPage((p) => p + 1)}>
              Older
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ThreadRow({ thread, active }: { thread: ChatThreadRowAdminDto; active: boolean }) {
  const order = orderLabel(thread.linkedOrderReference, thread.linkedDeliveryId)
  const last = thread.lastMessage
  const preview = last ? (last.senderKind === 'DISPATCH' ? `You: ${last.body}` : last.body) : ''
  return (
    <li className="border-b">
      <Link
        href={`/chat/${thread.id}`}
        aria-current={active ? 'page' : undefined}
        data-unread={thread.unread ? 'true' : 'false'}
        className={cn(
          'flex gap-3 px-4 py-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          active && 'bg-muted'
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-sm">{initials(thread.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">{thread.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{threadTime(thread.lastMessageAt)}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {roleLabel(thread.kind)}
            {order ? ` · ${order}` : ''}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className={cn('min-w-0 flex-1 truncate text-sm', thread.unread ? 'font-semibold' : 'text-muted-foreground')}>{preview}</p>
            {/* A mark, not a number: nothing counts one person's messages (AC-20). */}
            {thread.unread ? (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-destructive">
                <span className="sr-only">Unread</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
