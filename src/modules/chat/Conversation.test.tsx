import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { Conversation, CONVERSATION_POLL_MS } from './Conversation'
import type { ChatMessageAdminDto, ChatThreadAdminDto } from '../../backend-admin-sdk'

const mockUseGetChatThreadQuery = jest.fn()
const mockUseGetChatMessagesQuery = jest.fn()
const mockUseLazyGetChatMessagesQuery = jest.fn()
const mockMarkChatThreadRead = jest.fn()
const mockUseMarkChatThreadReadMutation = jest.fn()
const mockSendChatMessage = jest.fn()
const mockUseSendChatMessageMutation = jest.fn()

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

    mockUseLazyGetChatMessagesQuery.mockReturnValue([jest.fn(), { isFetching: false }])
    mockUseMarkChatThreadReadMutation.mockReturnValue([mockMarkChatThreadRead])
    mockUseSendChatMessageMutation.mockReturnValue([mockSendChatMessage])
  })

  describe('Conversation header (AC-3, AC-10)', () => {
    it('shows name, role, phone, a tel: Call link, courier StatusBadge, each active delivery with status and Open Delivery link, and "and N more"', () => {
      render(<Conversation threadId="thread-volos-1" />)

      // Name and role
      expect(screen.getByRole('heading', { level: 2, name: 'Kostas Karas' })).toBeInTheDocument()
      expect(screen.getByText(/Courier · \+306912345678/)).toBeInTheDocument()

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
})
