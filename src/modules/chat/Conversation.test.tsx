import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { Conversation, CONVERSATION_POLL_MS } from './Conversation'
import { focusComposerOnOpen } from './composerFocus'
import type { ChatMessageAdminDto, ChatThreadAdminDto } from '../../backend-admin-sdk'

const mockUseGetChatThreadQuery = jest.fn()
const mockUseGetChatMessagesQuery = jest.fn()
const mockUseLazyGetChatMessagesQuery = jest.fn()
const mockMarkChatThreadRead = jest.fn()
const mockUseMarkChatThreadReadMutation = jest.fn()
const mockSendChatMessage = jest.fn()
const mockUseSendChatMessageMutation = jest.fn()

let mockScrollHeight = 1000
let mockClientHeight = 400
let resizeObservers: Array<{ callback: () => void; observed: Element[] }> = []

function triggerResize() {
  act(() => {
    resizeObservers.forEach((ro) => ro.callback())
  })
}

jest.mock('../../api/chatApi', () => ({
  useGetChatThreadQuery: (id: string, opts: any) => mockUseGetChatThreadQuery(id, opts),
  useGetChatMessagesQuery: (args: any, opts: any) => mockUseGetChatMessagesQuery(args, opts),
  useLazyGetChatMessagesQuery: () => mockUseLazyGetChatMessagesQuery(),
  useMarkChatThreadReadMutation: () => mockUseMarkChatThreadReadMutation(),
  useSendChatMessageMutation: () => mockUseSendChatMessageMutation(),
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

let mockLive = true
jest.mock('./ChatLive', () => ({
  useChatLive: () => mockLive,
}))

describe('Conversation (spec 0034, AC-3, AC-5, AC-6, AC-7, AC-13, AC-19)', () => {
  const sampleThread: ChatThreadAdminDto = {
    id: 'thread-volos-1',
    kind: 'COURIER',
    courierId: 'courier-1',
    partnerId: null,
    name: 'Kostas Karas',
    phoneNumber: '+306912345678',
    courierStatus: 'ONLINE',
    activeDeliveries: [
      {
        id: 'del-active-1',
        orderReference: 'ORD-101',
        status: 'DISPATCHED' as any,
      },
    ],
    moreActiveDeliveries: 2,
    quickReplies: ['Wait 5 min', 'Leave at the door'],
    dispatchLastReadAt: '2026-11-17T14:00:00.000Z',
  }

  const sampleMessages: ChatMessageAdminDto[] = [
    {
      id: 'msg-1',
      threadId: 'thread-volos-1',
      senderKind: 'COURIER',
      senderName: 'Kostas Karas',
      body: 'I have arrived at pickup point',
      deliveryId: 'del-active-1',
      orderReference: 'ORD-101',
      createdAt: '2026-11-17T14:10:00.000Z',
    },
    {
      id: 'msg-2',
      threadId: 'thread-volos-1',
      senderKind: 'DISPATCH',
      senderName: 'Elena Dispatcher',
      body: 'Thanks Kostas, customer requested door delivery',
      deliveryId: 'del-active-1',
      orderReference: 'ORD-101',
      createdAt: '2026-11-17T14:12:00.000Z',
    },
    {
      id: 'msg-3',
      threadId: 'thread-volos-1',
      senderKind: 'SYSTEM',
      senderName: null,
      body: 'Reported: Flat tire on moped',
      deliveryId: 'del-active-1',
      orderReference: 'ORD-101',
      createdAt: '2026-11-17T14:15:00.000Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
    mockLive = true
    mockScrollHeight = 1000
    mockClientHeight = 400
    resizeObservers = []

    window.ResizeObserver = class {
      callback: () => void
      observed: Element[] = []
      constructor(cb: () => void) {
        this.callback = cb
        resizeObservers.push(this)
      }
      observe(el: Element) {
        this.observed.push(el)
      }
      unobserve() {}
      disconnect() {
        resizeObservers = resizeObservers.filter((o) => o !== this)
      }
    } as unknown as typeof ResizeObserver

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return (this as HTMLElement).classList.contains('overflow-y-auto') ? mockScrollHeight : 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return (this as HTMLElement).classList.contains('overflow-y-auto') ? mockClientHeight : 0
      },
    })

    mockUseGetChatThreadQuery.mockReturnValue({
      currentData: sampleThread,
      isError: false,
      isLoading: false,
    })

    mockUseGetChatMessagesQuery.mockReturnValue({
      currentData: sampleMessages,
      isError: false,
      isLoading: false,
      isSuccess: true,
    })

    mockMarkChatThreadRead.mockResolvedValue({ data: { dispatchLastReadAt: '2026-11-17T14:15:00.000Z' } })
    mockUseLazyGetChatMessagesQuery.mockReturnValue([jest.fn(), { isFetching: false }])
    mockUseMarkChatThreadReadMutation.mockReturnValue([mockMarkChatThreadRead])
    mockUseSendChatMessageMutation.mockReturnValue([mockSendChatMessage])
  })

  describe('Conversation header (AC-3, AC-10)', () => {
    it('shows name, role, phone, a tel: Call link, courier StatusBadge, each active delivery with status and Open Delivery link, and "and N more"', () => {
      render(<Conversation threadId="thread-volos-1" />)

      // Name and role
      expect(screen.getByRole('heading', { level: 2, name: 'Kostas Karas' })).toBeInTheDocument()
      const roleAndPhone = screen.getByText(
        (_, el) => el?.tagName.toLowerCase() === 'p' && el.textContent?.includes('Courier · +306912345678') === true
      )
      expect(roleAndPhone).toBeInTheDocument()
      expect(roleAndPhone).not.toHaveClass('truncate')

      const phoneSpan = screen.getByText('+306912345678')
      expect(phoneSpan).toBeInTheDocument()
      expect(phoneSpan).toHaveClass('whitespace-nowrap')
      expect(phoneSpan).not.toHaveClass('truncate')

      // Call button with tel: protocol
      const callLink = screen.getByRole('link', { name: /Call Kostas/i })
      expect(callLink).toBeInTheDocument()
      expect(callLink).toHaveAttribute('href', 'tel:+306912345678')

      // Courier StatusBadge
      expect(screen.getByText('Online')).toBeInTheDocument()

      // Active deliveries list
      const activeList = screen.getByRole('list', { name: 'Active deliveries' })
      expect(within(activeList).getByText(/#ORD-101/)).toBeInTheDocument()
      expect(within(activeList).getByText(/Dispatched/i)).toBeInTheDocument()

      const openDeliveryLink = within(activeList).getByRole('link', { name: 'Open Delivery' })
      expect(openDeliveryLink).toHaveAttribute('href', '/deliveries/del-active-1')

      // "and 2 more" when moreActiveDeliveries = 2
      expect(within(activeList).getByText('and 2 more')).toBeInTheDocument()

      // AC-3: NO minutes or times on delivery lines (no "for X min", no time)
      expect(within(activeList).queryByText(/min/i)).toBeNull()
      expect(within(activeList).queryByText(/\d{1,2}:\d{2}/)).toBeNull()
    })

    it('shows Offline notice when rider is OFFLINE (AC-10)', () => {
      const offlineThread: ChatThreadAdminDto = {
        ...sampleThread,
        courierStatus: 'OFFLINE',
      }
      mockUseGetChatThreadQuery.mockReturnValue({
        currentData: offlineThread,
        isError: false,
        isLoading: false,
      })

      render(<Conversation threadId="thread-volos-1" />)
      expect(
        screen.getByText(/Kostas is Offline\. A message waits until they next open the app, with no alert\./i)
      ).toBeInTheDocument()
    })

    it("the rider's phone number in the header is not truncated (no truncate class on it, verify fixes)", () => {
      render(<Conversation threadId="thread-volos-1" />)

      const phoneSpan = screen.getByText('+306912345678')
      expect(phoneSpan).toBeInTheDocument()
      expect(phoneSpan).toHaveClass('whitespace-nowrap')
      expect(phoneSpan).not.toHaveClass('truncate')

      const parentParagraph = phoneSpan.closest('p')
      expect(parentParagraph).not.toBeNull()
      expect(parentParagraph).not.toHaveClass('truncate')
    })
  })

  describe('Messages display (AC-5, AC-6)', () => {
    it('dispatch message shows colleague name and "Sent", never "read" anywhere on the page', () => {
      render(<Conversation threadId="thread-volos-1" />)

      // Dispatch message shows Elena Dispatcher · Sent
      expect(screen.getByText(/Elena Dispatcher · .* · Sent/)).toBeInTheDocument()

      // Must NEVER show "read" for dispatch's messages or anywhere on the page
      expect(screen.queryByText(/\bread\b/i)).toBeNull()
    })

    it('courier message shows rider name', () => {
      render(<Conversation threadId="thread-volos-1" />)

      // Courier message shows Kostas Karas
      expect(screen.getByText(/Kostas Karas · /)).toBeInTheDocument()
      expect(screen.getByText('I have arrived at pickup point')).toBeInTheDocument()
    })

    it('SYSTEM line renders as a centred line with its time and message body', () => {
      render(<Conversation threadId="thread-volos-1" />)

      const systemMessage = screen.getByText(/Reported: Flat tire on moped/)
      expect(systemMessage).toBeInTheDocument()
      // Centered line container
      const parentLi = systemMessage.closest('li')
      expect(parentLi).toHaveClass('justify-center')
    })
  })

  describe('Mark read behavior (AC-7)', () => {
    it('calls markChatThreadRead once when visible thread loads messages', () => {
      mockPageVisible = true
      render(<Conversation threadId="thread-volos-1" />)

      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(1)
      expect(mockMarkChatThreadRead).toHaveBeenCalledWith('thread-volos-1')
    })

    it('does not call markChatThreadRead when tab is hidden', () => {
      mockPageVisible = false
      render(<Conversation threadId="thread-volos-1" />)

      expect(mockMarkChatThreadRead).not.toHaveBeenCalled()
    })

    it('calls markChatThreadRead again when a new newest message arrives', () => {
      mockPageVisible = true
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(1)

      // A newer message arrives
      const updatedMessages: ChatMessageAdminDto[] = [
        ...sampleMessages,
        {
          id: 'msg-4',
          threadId: 'thread-volos-1',
          senderKind: 'COURIER',
          senderName: 'Kostas Karas',
          body: 'Order picked up successfully',
          deliveryId: 'del-active-1',
          orderReference: 'ORD-101',
          createdAt: '2026-11-17T14:18:00.000Z',
        },
      ]

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: updatedMessages,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(2)
    })

    it('mark read retry (Minor 9): a markChatThreadRead that rejects/fails is attempted again on the next fulfilled refetch; a successful one is not repeated; no second request while one is in flight', async () => {
      mockPageVisible = true

      // First call fails
      mockMarkChatThreadRead.mockResolvedValueOnce({ error: { status: 500 } })

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: sampleMessages,
        fulfilledTimeStamp: 1000,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      // First call made
      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(1)

      // Wait for promise to settle and clear markedFor on error
      await act(async () => {
        await Promise.resolve()
      })

      // Next fulfilled refetch occurs for the SAME newest message
      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: sampleMessages,
        fulfilledTimeStamp: 2000,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      // Next call succeeds
      mockMarkChatThreadRead.mockResolvedValueOnce({ data: { dispatchLastReadAt: '2026-11-17T14:15:00.000Z' } })

      rerender(<Conversation threadId="thread-volos-1" />)

      // It was attempted again!
      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(2)

      await act(async () => {
        await Promise.resolve()
      })

      // Next refetch occurs for the same newest message after successful markRead
      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: sampleMessages,
        fulfilledTimeStamp: 3000,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      // A successful one is NOT repeated
      expect(mockMarkChatThreadRead).toHaveBeenCalledTimes(2)
    })
  })

  describe('Composer & Presets (AC-13, decision 111.6)', () => {
    it('clicking an admin preset fills the text box and DOES NOT send immediately (decision 111.6)', () => {
      render(<Conversation threadId="thread-volos-1" />)

      const presetBtn = screen.getByRole('button', { name: 'Wait 5 min' })
      expect(presetBtn).toBeInTheDocument()

      fireEvent.click(presetBtn)

      // Presets fill the textarea
      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      expect(textarea).toHaveValue('Wait 5 min')

      // Must NOT send immediately
      expect(mockSendChatMessage).not.toHaveBeenCalled()
    })

    it('presets (Minor 6): the preset button has no fixed height and wraps (h-auto, whitespace-normal)', () => {
      render(<Conversation threadId="thread-volos-1" />)

      const presetBtn = screen.getByRole('button', { name: 'Wait 5 min' })
      expect(presetBtn).toHaveClass('h-auto', 'whitespace-normal')
    })

    it('presets: one row that scrolls sideways (overflow-x-auto and no wrap), each preset has max width and wraps its own text (verify fixes)', () => {
      render(<Conversation threadId="thread-volos-1" />)

      const group = screen.getByRole('group', { name: 'Quick replies' })
      expect(group).toBeInTheDocument()
      expect(group).toHaveClass('overflow-x-auto')
      expect(group).not.toHaveClass('flex-wrap')

      const presetBtns = screen.getAllByRole('button', { name: /Wait 5 min|Leave at the door/ })
      expect(presetBtns.length).toBeGreaterThan(0)
      for (const btn of presetBtns) {
        expect(btn).toHaveClass('h-auto', 'max-w-[16rem]', 'shrink-0', 'whitespace-normal', 'break-words')
      }
    })

    it('puts cursor in the message box (document.activeElement is textarea #chat-message) when opened via Message button (AC-15, verify fixes)', () => {
      focusComposerOnOpen('thread-volos-1')
      render(<Conversation threadId="thread-volos-1" />)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      expect(textarea).toHaveAttribute('id', 'chat-message')
      expect(document.activeElement).toBe(textarea)
    })

    it('does not focus the message box when opened without a focus request or for a different thread', () => {
      focusComposerOnOpen('thread-other-999')
      render(<Conversation threadId="thread-volos-1" />)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      expect(document.activeElement).not.toBe(textarea)
    })

    it('submitting the form sends trimmed text and clears textarea', async () => {
      mockSendChatMessage.mockResolvedValueOnce({ data: { id: 'srv-msg-1' } })
      render(<Conversation threadId="thread-volos-1" />)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      fireEvent.change(textarea, { target: { value: '  Hello Kostas  ' } })

      const sendBtn = screen.getByRole('button', { name: 'Send' })
      expect(sendBtn).toBeEnabled()

      // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
      await act(async () => {
        fireEvent.click(sendBtn)
      })

      expect(mockSendChatMessage).toHaveBeenCalledWith({
        threadId: 'thread-volos-1',
        input: expect.objectContaining({
          body: 'Hello Kostas',
          clientMessageId: expect.stringMatching(/^admin-/),
        }),
      })

      expect(textarea).toHaveValue('')
    })
  })

  describe('Failed send and retry (AC-19)', () => {
    it('a failed send stays on screen with "Not sent, click to retry", and retrying sends the SAME clientMessageId', async () => {
      // First attempt fails
      mockSendChatMessage.mockResolvedValueOnce({ error: { status: 500 } })

      render(<Conversation threadId="thread-volos-1" />)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      fireEvent.change(textarea, { target: { value: 'Testing signal failure' } })

      const sendBtn = screen.getByRole('button', { name: 'Send' })
      // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
      await act(async () => {
        fireEvent.click(sendBtn)
      })

      // Failed status appears with "Not sent, click to retry" (decision 111.7)
      const retryBtn = await screen.findByRole('button', { name: 'Not sent, click to retry' })
      expect(retryBtn).toBeInTheDocument()

      const firstCallArgs = mockSendChatMessage.mock.calls[0][0]
      const originalClientMessageId = firstCallArgs.input.clientMessageId

      // Second attempt succeeds
      mockSendChatMessage.mockResolvedValueOnce({ data: { id: 'srv-msg-retry' } })

      // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
      await act(async () => {
        fireEvent.click(retryBtn)
      })

      expect(mockSendChatMessage).toHaveBeenCalledTimes(2)
      const retryCallArgs = mockSendChatMessage.mock.calls[1][0]

      // Retrying sends the EXACT SAME clientMessageId
      expect(retryCallArgs.input.clientMessageId).toBe(originalClientMessageId)
      expect(retryCallArgs.input.body).toBe('Testing signal failure')
    })

    it('dedupe (Minor 2): a pending outgoing copy disappears once the server list holds a message with its clientMessageId (even when the send answer was lost), so the body shows once', async () => {
      // Send fails on the way back (or answers error), so serverId is never returned
      mockSendChatMessage.mockResolvedValueOnce({ error: { status: 504 } })

      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      fireEvent.change(textarea, { target: { value: 'Checking delivery status' } })

      const sendBtn = screen.getByRole('button', { name: 'Send' })
      // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
      await act(async () => {
        fireEvent.click(sendBtn)
      })

      // Pending copy shows as "Not sent, click to retry"
      expect(await screen.findByRole('button', { name: 'Not sent, click to retry' })).toBeInTheDocument()

      const clientMessageId = mockSendChatMessage.mock.calls[0][0].input.clientMessageId

      // Server list updates with a message that has this clientMessageId (reached server, but client response was lost)
      const messagesWithServerEcho: ChatMessageAdminDto[] = [
        ...sampleMessages,
        {
          id: 'server-stored-msg-1',
          clientMessageId,
          threadId: 'thread-volos-1',
          senderKind: 'DISPATCH',
          senderName: 'Elena Dispatcher',
          body: 'Checking delivery status',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T14:20:00.000Z',
        },
      ]

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: messagesWithServerEcho,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      // The pending "Not sent, click to retry" button is gone
      expect(screen.queryByRole('button', { name: 'Not sent, click to retry' })).toBeNull()

      // The message body shows exactly once on screen (as the server message with "Sent")
      const matches = screen.getAllByText('Checking delivery status')
      expect(matches).toHaveLength(1)
      const firstMatch = matches[0]
      expect(firstMatch).toBeDefined()
      const messageContainer = firstMatch?.closest('li')
      expect(messageContainer).not.toBeNull()
      if (!messageContainer) throw new Error('Expected messageContainer')
      expect(within(messageContainer).getByText(/Sent/)).toBeInTheDocument()
    })
  })

  describe('Polling intervals (AC-8)', () => {
    it('polls every 10 s (CONVERSATION_POLL_MS) when live is false and page is visible; does not poll when live is true', () => {
      mockLive = false
      mockPageVisible = true

      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      expect(mockUseGetChatThreadQuery).toHaveBeenCalledWith(
        'thread-volos-1',
        expect.objectContaining({ pollingInterval: CONVERSATION_POLL_MS })
      )
      expect(mockUseGetChatMessagesQuery).toHaveBeenCalledWith(
        { threadId: 'thread-volos-1' },
        expect.objectContaining({ pollingInterval: CONVERSATION_POLL_MS })
      )

      // When live is true
      mockLive = true
      rerender(<Conversation threadId="thread-volos-1" />)

      expect(mockUseGetChatThreadQuery).toHaveBeenCalledWith(
        'thread-volos-1',
        expect.objectContaining({ pollingInterval: 0 })
      )
      expect(mockUseGetChatMessagesQuery).toHaveBeenCalledWith(
        { threadId: 'thread-volos-1' },
        expect.objectContaining({ pollingInterval: 0 })
      )
    })
  })

  describe('Live region and screen reader announcements (Minor 8)', () => {
    it('no element containing the messages is a live region: neither the list nor any ancestor of a rendered message has aria-live (other than "off") or role log/status/alert, while the separate sr-only role=status announcement line exists and is not an ancestor of the messages', () => {
      render(<Conversation threadId="thread-volos-1" />)

      // The separate sr-only role=status announcement line exists
      const statusLine = screen.getByRole('status')
      expect(statusLine).toBeInTheDocument()
      expect(statusLine).toHaveClass('sr-only')

      // The list containing the messages
      const messageList = screen.getByRole('list', { name: /Messages with Kostas Karas/i })
      expect(messageList).toBeInTheDocument()
      expect(statusLine.contains(messageList)).toBe(false)

      // Rendered messages on screen
      const renderedMessages = [
        screen.getByText('I have arrived at pickup point'),
        screen.getByText('Thanks Kostas, customer requested door delivery'),
        screen.getByText(/Reported: Flat tire on moped/),
      ]

      // Neither the list nor any ancestor of a rendered message has aria-live (other than "off") or role log/status/alert
      for (const msgEl of renderedMessages) {
        expect(statusLine.contains(msgEl)).toBe(false)

        let current: HTMLElement | null = msgEl
        while (current && current !== document.body) {
          expect(current).not.toBe(statusLine)

          const live = current.getAttribute('aria-live')
          if (live !== null) {
            expect(live).toBe('off')
          }

          const role = current.getAttribute('role')
          expect(['log', 'status', 'alert']).not.toContain(role)

          current = current.parentElement
        }
      }
    })

    it('first load and "Show earlier messages" announce nothing', async () => {
      const mockLoadOlder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-older-1',
            threadId: 'thread-volos-1',
            senderKind: 'COURIER',
            senderName: 'Kostas Karas',
            body: 'Old message',
            deliveryId: null,
            orderReference: null,
            createdAt: '2026-11-17T13:00:00.000Z',
          },
        ],
      })
      mockUseLazyGetChatMessagesQuery.mockReturnValue([mockLoadOlder, { isFetching: false }])

      // 50 messages so "Show earlier messages" button shows
      const manyMessages: ChatMessageAdminDto[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-batch-${i}`,
        threadId: 'thread-volos-1',
        senderKind: 'COURIER',
        senderName: 'Kostas Karas',
        body: `Message ${i}`,
        deliveryId: null,
        orderReference: null,
        createdAt: `2026-11-17T13:${String(i).padStart(2, '0')}:00.000Z`,
      }))

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: manyMessages,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      render(<Conversation threadId="thread-volos-1" />)

      const statusLine = screen.getByRole('status')
      // First load announces nothing
      expect(statusLine).toHaveTextContent('')

      // Click "Show earlier messages"
      const showEarlierBtn = screen.getByRole('button', { name: 'Show earlier messages' })
      // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
      await act(async () => {
        fireEvent.click(showEarlierBtn)
      })

      // Still announces nothing
      expect(statusLine).toHaveTextContent('')
    })

    it('a newer COURIER or PARTNER message arriving puts "New message from <name>" in the role=status line', () => {
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)
      const statusLine = screen.getByRole('status')
      expect(statusLine).toHaveTextContent('')

      // Newer COURIER message arrives
      const updatedMessages: ChatMessageAdminDto[] = [
        ...sampleMessages,
        {
          id: 'msg-new-rider-1',
          threadId: 'thread-volos-1',
          senderKind: 'COURIER',
          senderName: 'Kostas Karas',
          body: 'I am outside',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T14:30:00.000Z',
        },
      ]

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: updatedMessages,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      expect(statusLine).toHaveTextContent('New message from Kostas Karas, 16:30')
    })

    it('a DISPATCH or SYSTEM message announces nothing in the status line', () => {
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)
      const statusLine = screen.getByRole('status')
      expect(statusLine).toHaveTextContent('')

      // DISPATCH message arrives
      const withDispatchMessage: ChatMessageAdminDto[] = [
        ...sampleMessages,
        {
          id: 'msg-admin-echo',
          threadId: 'thread-volos-1',
          senderKind: 'DISPATCH',
          senderName: 'Elena Dispatcher',
          body: 'Understood',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T14:32:00.000Z',
        },
      ]

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: withDispatchMessage,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)
      expect(statusLine).toHaveTextContent('')

      // SYSTEM message arrives
      const withSystemMessage: ChatMessageAdminDto[] = [
        ...withDispatchMessage,
        {
          id: 'msg-sys-line',
          threadId: 'thread-volos-1',
          senderKind: 'SYSTEM',
          senderName: null,
          body: 'Reported: Client not answering',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T14:35:00.000Z',
        },
      ]

      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: withSystemMessage,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)
      expect(statusLine).toHaveTextContent('')
    })
  })

  describe('Message list scrolling and ResizeObserver (spec 0034, verify fixes, decision 111.17)', () => {
    it('scrolls to the bottom (scrollTop set to scrollHeight) when a thread first shows with its messages', () => {
      // Initially loading thread
      mockUseGetChatThreadQuery.mockReturnValue({
        currentData: null,
        isError: false,
        isLoading: true,
      })
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)
      expect(screen.getByText('Loading the conversation…')).toBeInTheDocument()

      mockScrollHeight = 1000
      mockClientHeight = 400
      mockUseGetChatThreadQuery.mockReturnValue({
        currentData: sampleThread,
        isError: false,
        isLoading: false,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list).toHaveClass('overflow-y-auto')
      expect(list.scrollTop).toBe(1000)
      expect(list.scrollTop).toBe(list.scrollHeight)
    })

    it('scrolls to the bottom when the thread changes to another (rerender with a new thread id and new messages)', () => {
      mockScrollHeight = 1000
      mockClientHeight = 400
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list.scrollTop).toBe(1000)

      // Admin had scrolled up
      list.scrollTop = 150
      fireEvent.scroll(list)
      expect(list.scrollTop).toBe(150)

      // Thread changes to thread-volos-2 with different messages
      const sampleThread2: ChatThreadAdminDto = {
        ...sampleThread,
        id: 'thread-volos-2',
        name: 'Maria Rider',
      }
      const sampleMessages2: ChatMessageAdminDto[] = [
        {
          id: 'msg-th2-1',
          threadId: 'thread-volos-2',
          senderKind: 'COURIER',
          senderName: 'Maria Rider',
          body: 'Hello dispatch',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T15:00:00.000Z',
        },
      ]
      mockScrollHeight = 1200
      mockUseGetChatThreadQuery.mockReturnValue({
        currentData: sampleThread2,
        isError: false,
        isLoading: false,
      })
      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: sampleMessages2,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-2" />)

      expect(list.scrollTop).toBe(1200)
      expect(list.scrollTop).toBe(list.scrollHeight)
    })

    it('scrolls to the bottom on a new message arriving', () => {
      mockScrollHeight = 1000
      mockClientHeight = 400
      const { rerender } = render(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list.scrollTop).toBe(1000)

      mockScrollHeight = 1350
      const updatedMessages: ChatMessageAdminDto[] = [
        ...sampleMessages,
        {
          id: 'msg-brand-new',
          threadId: 'thread-volos-1',
          senderKind: 'COURIER',
          senderName: 'Kostas Karas',
          body: 'At customer door now',
          deliveryId: null,
          orderReference: null,
          createdAt: '2026-11-17T14:40:00.000Z',
        },
      ]
      mockUseGetChatMessagesQuery.mockReturnValue({
        currentData: updatedMessages,
        isError: false,
        isLoading: false,
        isSuccess: true,
      })

      rerender(<Conversation threadId="thread-volos-1" />)

      expect(list.scrollTop).toBe(1350)
      expect(list.scrollTop).toBe(list.scrollHeight)
    })

    it('scrolls to the bottom after sending a message', async () => {
      mockScrollHeight = 1000
      mockClientHeight = 400
      render(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list.scrollTop).toBe(1000)

      const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
      fireEvent.change(textarea, { target: { value: 'Got it, thanks' } })

      mockScrollHeight = 1500
      mockSendChatMessage.mockResolvedValueOnce({ data: { id: 'srv-msg-new' } })

      const sendBtn = screen.getByRole('button', { name: 'Send' })
      // eslint-disable-next-line @typescript-eslint/require-await -- async act flushes promises
      await act(async () => {
        fireEvent.click(sendBtn)
      })

      expect(list.scrollTop).toBe(1500)
      expect(list.scrollTop).toBe(list.scrollHeight)
    })

    it('a later resize of the list (ResizeObserver callback) scrolls to bottom only while admin was at the newest line', () => {
      mockScrollHeight = 1000
      mockClientHeight = 400
      render(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list.scrollTop).toBe(1000)

      // Admin is at the newest line; resize happens
      mockScrollHeight = 1250
      triggerResize()

      expect(list.scrollTop).toBe(1250)
      expect(list.scrollTop).toBe(list.scrollHeight)
    })

    it('after the admin scrolled up (scroll event with scrollTop well above bottom), a resize or an older reflow does not move them', () => {
      mockScrollHeight = 1000
      mockClientHeight = 400
      render(<Conversation threadId="thread-volos-1" />)

      const list = screen.getByRole('list', { name: /Messages with/i }).parentElement as HTMLDivElement
      expect(list.scrollTop).toBe(1000)

      // Admin scrolls up (1000 - 300 - 400 = 300 >= 8)
      list.scrollTop = 300
      fireEvent.scroll(list)

      // Resize event occurs while scrolled up
      mockScrollHeight = 1600
      triggerResize()

      // Must remain at 300, NOT dragged down to 1600
      expect(list.scrollTop).toBe(300)
      expect(list.scrollTop).not.toBe(1600)
    })
  })
})
