import { io } from 'socket.io-client'
import {
  chatSocketUrl,
  connectChatLive,
  disconnectChatLive,
  isChatLive,
  subscribeChatLive,
  CHAT_SOCKET_NAMESPACE,
  type ChatLiveHandlers,
} from './chatLive'

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

describe('chatLive (spec 0034, AC-8)', () => {
  let mockSocket: any
  let registeredEvents: Record<string, (...args: unknown[]) => unknown>
  let mockHandlers: ChatLiveHandlers

  const trigger = (event: string, payload?: any) => {
    registeredEvents[event]?.(payload)
  }

  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_API_URL: 'https://api.volos.courier.coop/api/admin/v1' }
    registeredEvents = {}

    mockSocket = {
      on: jest.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        registeredEvents[event] = handler
      }),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    }
    ;(io as unknown as jest.Mock).mockReturnValue(mockSocket)

    mockHandlers = {
      onConnect: jest.fn(),
      onMessage: jest.fn(),
      onThreadRead: jest.fn(),
    }

    disconnectChatLive()
  })

  afterEach(() => {
    disconnectChatLive()
    process.env = ORIGINAL_ENV
  })

  describe('chatSocketUrl', () => {
    it('extracts origin from apiUrl and appends /admins namespace', () => {
      expect(chatSocketUrl('https://api.volos.courier.coop/api/admin/v1')).toBe(
        `https://api.volos.courier.coop/${CHAT_SOCKET_NAMESPACE}`
      )
      expect(chatSocketUrl('http://localhost:3000/some/path')).toBe(
        `http://localhost:3000/${CHAT_SOCKET_NAMESPACE}`
      )
    })

    it('returns null when apiUrl is missing or malformed', () => {
      expect(chatSocketUrl(undefined)).toBeNull()
      expect(chatSocketUrl('')).toBeNull()
      expect(chatSocketUrl('not-a-valid-url')).toBeNull()
    })
  })

  describe('connectChatLive connection lifecycle', () => {
    it('opens one socket to <origin of NEXT_PUBLIC_API_URL>/admins with Bearer token', () => {
      connectChatLive('admin-token-123', mockHandlers)

      expect(io).toHaveBeenCalledTimes(1)
      expect(io).toHaveBeenCalledWith(
        'https://api.volos.courier.coop/admins',
        expect.objectContaining({
          auth: { authorization: 'Bearer admin-token-123' },
          transports: ['websocket'],
          reconnectionDelayMax: 30_000,
        })
      )
    })

    it('reuses existing socket when called with the same token', () => {
      connectChatLive('admin-token-123', mockHandlers)
      expect(io).toHaveBeenCalledTimes(1)

      // Call again with same token -> should not create a new socket
      connectChatLive('admin-token-123', mockHandlers)
      expect(io).toHaveBeenCalledTimes(1)
    })

    it('replaces existing socket when called with a new token', () => {
      connectChatLive('token-1', mockHandlers)
      expect(io).toHaveBeenCalledTimes(1)

      // Call with different token -> disconnects old and creates new
      connectChatLive('token-2', mockHandlers)
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(io).toHaveBeenCalledTimes(2)
      expect(io).toHaveBeenLastCalledWith(
        'https://api.volos.courier.coop/admins',
        expect.objectContaining({
          auth: { authorization: 'Bearer token-2' },
        })
      )
    })

    it('closes socket when called with null or empty token', () => {
      connectChatLive('token-1', mockHandlers)
      expect(io).toHaveBeenCalledTimes(1)

      connectChatLive(null, mockHandlers)
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(isChatLive()).toBe(false)
    })
  })

  describe('socket event handlers and isChatLive state', () => {
    it('calls onConnect and marks isChatLive true on connect event', () => {
      const listener = jest.fn()
      const unsubscribe = subscribeChatLive(listener)

      connectChatLive('token-1', mockHandlers)
      expect(isChatLive()).toBe(false)

      // Trigger connect
      trigger('connect')
      expect(isChatLive()).toBe(true)
      expect(mockHandlers.onConnect).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalled()

      unsubscribe()
    })

    it('marks isChatLive false on disconnect or connect_error', () => {
      connectChatLive('token-1', mockHandlers)
      trigger('connect')
      expect(isChatLive()).toBe(true)

      // Trigger disconnect
      trigger('disconnect')
      expect(isChatLive()).toBe(false)

      // Reconnect then trigger connect_error
      trigger('connect')
      expect(isChatLive()).toBe(true)
      trigger('connect_error')
      expect(isChatLive()).toBe(false)
    })

    it('calls onMessage when CHAT_MESSAGE payload is well-formed', () => {
      connectChatLive('token-1', mockHandlers)

      const validMessage = {
        id: 'msg-1',
        threadId: 'th-1',
        senderKind: 'COURIER',
        senderName: 'Rider',
        body: 'Hello',
        deliveryId: null,
        orderReference: null,
        createdAt: '2026-11-17T14:00:00.000Z',
      }
      trigger('CHAT_MESSAGE', { threadId: 'th-1', message: validMessage })

      expect(mockHandlers.onMessage).toHaveBeenCalledWith('th-1', validMessage)
    })

    it('ignores malformed CHAT_MESSAGE payloads (missing threadId, missing message, or invalid types)', () => {
      connectChatLive('token-1', mockHandlers)

      // null payload
      trigger('CHAT_MESSAGE', null)
      // undefined payload
      trigger('CHAT_MESSAGE', undefined)
      // non-string threadId
      trigger('CHAT_MESSAGE', { threadId: 123, message: {} })
      // missing message
      trigger('CHAT_MESSAGE', { threadId: 'th-1' })
      // non-object message
      trigger('CHAT_MESSAGE', { threadId: 'th-1', message: 'string-not-object' })

      expect(mockHandlers.onMessage).not.toHaveBeenCalled()
    })

    it('calls onThreadRead when CHAT_THREAD_READ payload is well-formed and ignores malformed payloads', () => {
      connectChatLive('token-1', mockHandlers)

      // Valid payload
      trigger('CHAT_THREAD_READ', { threadId: 'th-read-1' })
      expect(mockHandlers.onThreadRead).toHaveBeenCalledWith('th-read-1')

      // Malformed payloads
      trigger('CHAT_THREAD_READ', null)
      trigger('CHAT_THREAD_READ', {})
      trigger('CHAT_THREAD_READ', { threadId: 456 })

      expect(mockHandlers.onThreadRead).toHaveBeenCalledTimes(1)
    })
  })
})
