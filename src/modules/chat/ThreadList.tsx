import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass } from '@phosphor-icons/react'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import type { ChatTab, ChatThreadRowAdminDto } from '../../backend-admin-sdk'
import { useGetChatThreadsQuery, useGetChatUnreadCountQuery } from '@/api/chatApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useFormat } from '@/i18n/useFormat'
import { Avatar, AvatarFallback, Button, Input, Tabs, TabsList, TabsTrigger } from '../../admin-web-components'
import { cn } from '../../ui-shared-utils'
import { useChatLive } from './ChatLive'
import { initials, orderLabel, roleLabel, threadTime } from './chatDisplay'

// Without the live connection the list refreshes on this beat while the tab is visible (AC-8).
export const THREAD_LIST_POLL_MS = 30_000
const SEARCH_DELAY_MS = 300

// The tabs in order. Each tab's name is `chat.list.tabs.<tab>` and its empty list sentence
// `chat.list.empty.<tab>`, looked up when the list draws so they follow the reader's language.
const TABS: ChatTab[] = ['UNREAD', 'COURIERS', 'RESTAURANTS', 'ALL']

// Row 115: the open thread kept on the Unread tab, with where it was seen.
type KeptThread = { row: ChatThreadRowAdminDto; tab: ChatTab; search: string; page: number }

// Row 115: the list with the kept thread put back in its place (newest first), shown as read.
// `lastMessageAt` is compared as text: the server always sends one ISO 8601 format, which sorts
// the same as the times. A kept row goes after rows with the same time.
// Nothing changes when there is no kept thread or the server still lists it.
export function withKeptThread(listed: ChatThreadRowAdminDto[], kept: ChatThreadRowAdminDto | null): ChatThreadRowAdminDto[] {
  if (!kept || listed.some((thread) => thread.id === kept.id)) return listed
  const row = { ...kept, unread: false }
  const newer = (thread: ChatThreadRowAdminDto) => (thread.lastMessageAt ?? '') >= (kept.lastMessageAt ?? '')
  const at = listed.filter(newer).length
  return [...listed.slice(0, at), row, ...listed.slice(at)]
}

// AC-2: the inbox, newest first, 50 a page. Search by a name, a rider's phone or an order number.
export function ThreadList({ activeThreadId }: { activeThreadId: string | null }) {
  const { t } = useTranslation()
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

  const { data, isLoading, isError, isFetching } = useGetChatThreadsQuery(
    { tab, search: search || undefined, page },
    { pollingInterval: !live && pageVisible ? THREAD_LIST_POLL_MS : 0 }
  )
  const { data: unread } = useGetChatUnreadCountQuery()
  const unreadCount = unread?.count ?? 0
  const pagination = data?.pagination

  // Row 115: on the Unread tab, opening a thread reads it, and the server then leaves it out of the
  // list. Keep the open thread in view, shown as read, so a search does not suddenly match nothing
  // while you are reading. It goes once you open another thread or change the tab, the search or the
  // page. The row remembers the tab, search and page it was seen under, and the rule below compares
  // them on every draw (decision 115.3), so no second effect can race to clear it.
  const [kept, setKept] = useState<KeptThread | null>(null)
  const listed = data?.data ?? []
  // While a new search loads, `data` still holds the previous answer, so a row is only saved from
  // an answer that has finished loading for what is on screen now.
  const listedActive = isFetching ? undefined : listed.find((thread) => thread.id === activeThreadId)
  useEffect(() => {
    if (listedActive) setKept({ row: listedActive, tab, search, page })
  }, [listedActive, tab, search, page])
  const keepsRow =
    tab === 'UNREAD' && kept !== null && kept.row.id === activeThreadId && kept.tab === tab && kept.search === search && kept.page === page
  // Its preview and time stay as they were when it was last listed (a reply of your own does not
  // bring it back to the Unread list); it is only kept while you read it.
  const threads = withKeptThread(listed, keepsRow ? kept.row : null)

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t('chat.list.searchLabel')}
            placeholder={t('chat.list.searchPlaceholder')}
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
          <TabsList className="w-full justify-start">
            {TABS.map((item) => (
              <TabsTrigger key={item} value={item} className="gap-1.5">
                {t(`chat.list.tabs.${item}`)}
                {item === 'UNREAD' && unreadCount > 0 ? (
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
            {t('chat.list.unreachable')}
          </p>
        ) : null}
        {isLoading ? <p className="p-4 text-sm text-muted-foreground">{t('chat.list.loading')}</p> : null}
        {!isLoading && !isError && threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{search ? t('chat.list.noMatch', { search }) : t(`chat.list.empty.${tab}`)}</p>
        ) : null}
        {/* No label of its own: the section around it is already named "Conversations". */}
        <ul>
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} active={thread.id === activeThreadId} />
          ))}
        </ul>
        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 p-4 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={!pagination.prevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t('chat.list.newer')}
            </Button>
            <span>{t('chat.list.page', { current: pagination.currentPage, total: pagination.totalPages })}</span>
            <Button variant="outline" size="sm" disabled={!pagination.nextPage} onClick={() => setPage((p) => p + 1)}>
              {t('chat.list.older')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ThreadRow({ thread, active }: { thread: ChatThreadRowAdminDto; active: boolean }) {
  const { t } = useTranslation()
  const f = useFormat()
  const order = orderLabel(thread.linkedOrderReference, thread.linkedDeliveryId)
  const last = thread.lastMessage
  const preview = last ? (last.senderKind === 'DISPATCH' ? t('chat.list.you', { body: last.body }) : last.body) : ''
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
            <span className="shrink-0 text-xs text-muted-foreground">{threadTime(thread.lastMessageAt, new Date(), f.language)}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {roleLabel(thread.kind, t)}
            {order ? ` · ${order}` : ''}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className={cn('min-w-0 flex-1 truncate text-sm', thread.unread ? 'font-semibold' : 'text-muted-foreground')}>{preview}</p>
            {/* A mark, not a number: nothing counts one person's messages (AC-20). */}
            {thread.unread ? (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-destructive">
                <span className="sr-only">{t('chat.list.unread')}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
