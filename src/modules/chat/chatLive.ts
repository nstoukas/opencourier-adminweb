// Spec 0034 (chat), AC-8: the admin's live connection to new messages, on the backend's `admins`
// Socket.IO namespace. One connection per browser tab, kept across page changes, so moving between
// admin pages never drops a message. Messages are stored in the database, not in the socket: every
// (re)connect asks the pages to fetch again, so nothing sent while it was down is missed.
//
// With the backend on Ably there is no Socket.IO server; the connection never opens, `isChatLive()`
// stays false, and the pages poll instead.

import { io, Socket } from 'socket.io-client'
import type { ChatMessageAdminDto } from '../../backend-admin-sdk'

export const CHAT_SOCKET_NAMESPACE = 'admins'

export type ChatLiveHandlers = {
  // A new message in a thread (any sender).
  onMessage: (threadId: string, message: ChatMessageAdminDto) => void
  // Another admin (or this one) read a thread.
  onThreadRead: (threadId: string) => void
  // The connection opened or came back: fetch everything again.
  onConnect: () => void
}

let socket: Socket | null = null
let socketToken: string | null = null
let live = false
// A close asked for when ChatLive unmounted, waiting to see whether the next page mounts it again.
// `ReturnType<typeof setTimeout>` is "whatever setTimeout returns", a number in the browser.
let pendingClose: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function setLive(next: boolean): void {
  if (live === next) return
  live = next
  listeners.forEach((listener) => listener())
}

// For useSyncExternalStore: whether the live connection is open now.
export function isChatLive(): boolean {
  return live
}

export function subscribeChatLive(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The backend's origin, from the same setting the SDK uses (`NEXT_PUBLIC_API_URL`).
export function chatSocketUrl(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null
  try {
    return `${new URL(apiUrl).origin}/${CHAT_SOCKET_NAMESPACE}`
  } catch {
    return null
  }
}

// Opens the connection for this token, or keeps the one already open for it. A different token (a new
// sign in) closes the old one first; no token closes it.
export function connectChatLive(token: string | null, handlers: ChatLiveHandlers): void {
  cancelPendingClose()
  if (token === socketToken && socket) return
  disconnectChatLive()
  const url = chatSocketUrl(process.env.NEXT_PUBLIC_API_URL)
  if (!token || !url) return

  socketToken = token
  socket = io(url, {
    auth: { authorization: `Bearer ${token}` },
    transports: ['websocket'],
    // Keep trying, but gently: with Ably on the server there is nothing to reach.
    reconnectionDelayMax: 30_000,
  })
  socket.on('connect', () => {
    setLive(true)
    handlers.onConnect()
  })
  socket.on('disconnect', () => setLive(false))
  socket.on('connect_error', () => setLive(false))
  // What arrives over the wire is checked, not trusted to match a type.
  socket.on('CHAT_MESSAGE', (payload: unknown) => {
    const { threadId, message } = (payload ?? {}) as { threadId?: unknown; message?: ChatMessageAdminDto }
    if (typeof threadId === 'string' && message && typeof message === 'object') {
      handlers.onMessage(threadId, message)
    }
  })
  socket.on('CHAT_THREAD_READ', (payload: unknown) => {
    const { threadId } = (payload ?? {}) as { threadId?: unknown }
    if (typeof threadId === 'string') handlers.onThreadRead(threadId)
  })
}

// ChatLive unmounted. On a page change the next page's ChatLive mounts in the same render and cancels
// this, so the connection survives; when nothing mounts it again (signed out), it closes.
export function closeChatLiveSoon(): void {
  cancelPendingClose()
  pendingClose = setTimeout(disconnectChatLive, 0)
}

function cancelPendingClose(): void {
  if (pendingClose !== null) clearTimeout(pendingClose)
  pendingClose = null
}

// Closes the connection now: sign out, a 401, or a new sign in replacing it.
export function disconnectChatLive(): void {
  cancelPendingClose()
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
  socketToken = null
  setLive(false)
}
