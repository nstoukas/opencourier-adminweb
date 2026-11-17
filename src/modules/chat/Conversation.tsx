import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, PhoneCall, WarningCircle } from '@phosphor-icons/react'
import type { ChatMessageAdminDto, ChatThreadAdminDto } from '../../backend-admin-sdk'
import {
  useGetChatMessagesQuery,
  useGetChatThreadQuery,
  useLazyGetChatMessagesQuery,
  useMarkChatThreadReadMutation,
  useSendChatMessageMutation,
} from '@/api/chatApi'
import { usePageVisible } from '@/hooks/usePageVisible'
import { Avatar, AvatarFallback, Button, StatusBadge, Textarea, statusLabel } from '../../admin-web-components'
import { cn } from '../../ui-shared-utils'
import { useChatLive } from './ChatLive'
import { CHAT_MESSAGE_MAX_LENGTH, initials, messageTime, newClientMessageId, orderLabel, roleLabel, sendableText } from './chatDisplay'

// Without the live connection, an open conversation asks again on this beat (AC-8).
export const CONVERSATION_POLL_MS = 10_000

// A message this admin sent that the server has not confirmed yet, or that failed (AC-19).
type Outgoing = { clientMessageId: string; body: string; state: 'sending' | 'failed'; serverId?: string }

// One conversation: who it is with and what they have going now (AC-3), the messages (AC-5, AC-6), and
// the box to answer in with dispatch's presets (AC-4, AC-13).
export function Conversation({ threadId }: { threadId: string }) {
  const pageVisible = usePageVisible()
  const live = useChatLive()
  const poll = !live && pageVisible ? CONVERSATION_POLL_MS : 0

  // currentData: going from one thread to another never shows the previous one's data.
  const threadQuery = useGetChatThreadQuery(threadId, { pollingInterval: poll })
  const messagesQuery = useGetChatMessagesQuery({ threadId }, { pollingInterval: poll, refetchOnMountOrArgChange: true })
  const thread = threadQuery.currentData
  const newest = messagesQuery.currentData

  const [older, setOlder] = useState<ChatMessageAdminDto[]>([])
  const [noMoreOlder, setNoMoreOlder] = useState(false)
  const [outgoing, setOutgoing] = useState<Outgoing[]>([])
  const [loadOlder, olderQuery] = useLazyGetChatMessagesQuery()
  useEffect(() => {
    setOlder([])
    setNoMoreOlder(false)
    setOutgoing([])
  }, [threadId])

  const messages = useMemo(() => {
    const seen = new Set<string>()
    return [...older, ...(newest ?? [])].filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
  }, [older, newest])
  const shownIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages])
  // A sent message leaves the outgoing list once the server's list holds it.
  const pending = outgoing.filter((item) => !item.serverId || !shownIds.has(item.serverId))

  // AC-7: opening the thread in a visible tab reads it for every admin, and so does a message arriving
  // while it is open. Asked once per newest message.
  const [markRead] = useMarkChatThreadReadMutation()
  const newestId = newest?.at(-1)?.id ?? null
  const markedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!pageVisible || !newestId || markedFor.current === `${threadId}:${newestId}`) return
    markedFor.current = `${threadId}:${newestId}`
    void markRead(threadId)
  }, [markRead, newestId, pageVisible, threadId])

  // Keep the newest message in view as messages arrive.
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [newestId, pending.length])

  const [send] = useSendChatMessageMutation()
  async function deliver(item: Outgoing) {
    setOutgoing((list) => list.map((entry) => (entry.clientMessageId === item.clientMessageId ? { ...entry, state: 'sending' } : entry)))
    const result = await send({ threadId, input: { body: item.body, clientMessageId: item.clientMessageId } })
    setOutgoing((list) =>
      list.map((entry) =>
        entry.clientMessageId !== item.clientMessageId
          ? entry
          : 'data' in result
            ? { ...entry, serverId: result.data.id }
            : { ...entry, state: 'failed' }
      )
    )
  }
  function sendText(text: string): boolean {
    const body = sendableText(text)
    if (!body) return false
    const item: Outgoing = { clientMessageId: newClientMessageId(), body, state: 'sending' }
    setOutgoing((list) => [...list, item])
    void deliver(item)
    return true
  }

  async function showOlder() {
    const oldest = messages[0]
    if (!oldest) return
    const result = await loadOlder({ threadId, before: oldest.id })
    const page = result.data ?? []
    if (page.length === 0) setNoMoreOlder(true)
    setOlder((list) => [...page, ...list])
  }

  if (threadQuery.isError && !thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">This conversation can&apos;t be shown. It may not exist, or the server can&apos;t be reached.</p>
        <Button asChild variant="outline">
          <Link href="/chat">Back to Messages</Link>
        </Button>
      </div>
    )
  }
  if (!thread) {
    return <p className="p-6 text-sm text-muted-foreground">Loading the conversation…</p>
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConversationHeader thread={thread} />

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-label={`Messages with ${thread.name}`}>
        {messagesQuery.isError ? (
          <p role="status" className="text-sm text-destructive">
            Messages can&apos;t be reached right now. They will load again on their own.
          </p>
        ) : null}
        {messages.length >= 50 && !noMoreOlder ? (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => void showOlder()} disabled={olderQuery.isFetching}>
              {olderQuery.isFetching ? 'Loading…' : 'Show earlier messages'}
            </Button>
          </div>
        ) : null}
        {messagesQuery.isSuccess && messages.length === 0 && pending.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Write the first one below.</p>
        ) : null}
        <ol className="space-y-4">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} partyName={thread.name} />
          ))}
          {pending.map((item) => (
            <li key={item.clientMessageId} className="flex flex-col items-end gap-1">
              <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-primary/70 px-4 py-2 text-primary-foreground">{item.body}</p>
              {item.state === 'failed' ? (
                <button
                  type="button"
                  onClick={() => void deliver(item)}
                  className="text-xs font-medium text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Not sent, click to retry
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Sending…</span>
              )}
            </li>
          ))}
        </ol>
        <div ref={endRef} />
      </div>

      <Composer thread={thread} onSend={sendText} />
    </div>
  )
}

function ConversationHeader({ thread }: { thread: ChatThreadAdminDto }) {
  const firstName = thread.name.split(' ')[0] || thread.name
  const offline = thread.kind === 'COURIER' && thread.courierStatus === 'OFFLINE'
  return (
    <div className="border-b">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Link href="/chat" className="rounded-md p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Back to all conversations</span>
        </Link>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">{initials(thread.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{thread.name}</h2>
            {thread.courierStatus ? <StatusBadge status={thread.courierStatus} kind="courier" /> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {roleLabel(thread.kind)}
            {thread.phoneNumber ? ` · ${thread.phoneNumber}` : ''}
          </p>
        </div>
        {thread.phoneNumber ? (
          <Button asChild variant="outline">
            <a href={`tel:${thread.phoneNumber}`}>
              <PhoneCall aria-hidden="true" className="mr-2 h-4 w-4" />
              Call {firstName}
            </a>
          </Button>
        ) : null}
      </div>

      {/* AC-10: a rider's time off stays off. The message is kept and no alert goes to the phone. */}
      {offline ? (
        <p className="mx-4 mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {firstName} is Offline. A message waits until they next open the app, with no alert. Call if it can&apos;t wait.
        </p>
      ) : null}

      {/* AC-3: what they have going now, so dispatch can open it. No minutes and no position. */}
      {thread.activeDeliveries.length > 0 ? (
        <ul className="space-y-2 px-4 pb-4" aria-label="Active deliveries">
          {thread.activeDeliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning-foreground/20 bg-warning-soft px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <WarningCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="font-medium">{orderLabel(delivery.orderReference, delivery.id)}</span>
                <span>· {statusLabel(delivery.status, 'delivery')}</span>
              </span>
              <Button asChild size="sm">
                <Link href={`/deliveries/${delivery.id}`}>Open Delivery</Link>
              </Button>
            </li>
          ))}
          {thread.moreActiveDeliveries > 0 ? (
            <li className="text-sm text-muted-foreground">and {thread.moreActiveDeliveries} more</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

function MessageItem({ message, partyName }: { message: ChatMessageAdminDto; partyName: string }) {
  const order = orderLabel(message.orderReference, message.deliveryId)
  const orderLink = order && message.deliveryId ? (
    <Link href={`/deliveries/${message.deliveryId}`} className="underline-offset-2 hover:underline">
      {order}
    </Link>
  ) : null

  if (message.senderKind === 'SYSTEM') {
    return (
      <li className="flex justify-center">
        <p className="max-w-[90%] whitespace-pre-wrap break-words rounded-full bg-destructive-soft px-3 py-1 text-center text-xs font-medium">
          {messageTime(message.createdAt)} · {message.body}
          {orderLink ? <> · {orderLink}</> : null}
        </p>
      </li>
    )
  }

  const fromDispatch = message.senderKind === 'DISPATCH'
  const who = fromDispatch ? message.senderName ?? 'Dispatch' : message.senderName ?? partyName
  return (
    <li className={cn('flex flex-col gap-1', fromDispatch ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2',
          fromDispatch ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {message.body}
      </p>
      <span className="text-xs text-muted-foreground">
        {who} · {messageTime(message.createdAt)}
        {orderLink ? <> · {orderLink}</> : null}
        {/* "Sent" means the server stored it. Dispatch never sees whether a rider read it (AC-6). */}
        {fromDispatch ? ' · Sent' : ''}
      </span>
    </li>
  )
}

function Composer({ thread, onSend }: { thread: ChatThreadAdminDto; onSend: (text: string) => boolean }) {
  const [text, setText] = useState('')
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const firstName = thread.name.split(' ')[0] || thread.name
  const canSend = sendableText(text) !== null

  function submit() {
    if (onSend(text)) setText('')
  }
  // Enter sends, Shift and Enter starts a new line.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="space-y-3 border-t p-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {/* AC-13: dispatch's presets. A tap puts the words in the box, to send as they are or edit first
          (decision 111.6). */}
      {thread.quickReplies.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Quick replies" role="group">
          {thread.quickReplies.map((reply) => (
            <Button
              key={reply}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setText(reply)
                boxRef.current?.focus()
              }}
            >
              {reply}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="rounded-md border focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor="chat-message" className="sr-only">
          Message to {thread.name}
        </label>
        <Textarea
          id="chat-message"
          ref={boxRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Write to ${firstName}`}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          rows={3}
          className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <span className="text-xs text-muted-foreground">Text only. Enter sends, Shift and Enter starts a new line.</span>
          <Button type="submit" disabled={!canSend}>
            Send
          </Button>
        </div>
      </div>
    </form>
  )
}
