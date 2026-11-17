import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { ThreadList, THREAD_LIST_POLL_MS } from './ThreadList'
import type { ChatThreadRowAdminDto } from '../../backend-admin-sdk'
import { initials, orderLabel, roleLabel, threadTime } from './chatDisplay'

const mockUseGetChatThreadsQuery = jest.fn()
const mockUseGetChatUnreadCountQuery = jest.fn()

jest.mock('../../api/chatApi', () => ({
  useGetChatThreadsQuery: (args: any, opts: any) => mockUseGetChatThreadsQuery(args, opts),
  useGetChatUnreadCountQuery: () => mockUseGetChatUnreadCountQuery(),
}))

let mockLive = true
jest.mock('./ChatLive', () => ({
  useChatLive: () => mockLive,
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

describe('ThreadList (spec 0034, AC-2, AC-20, decision 111.7)', () => {
  const sampleThreads: ChatThreadRowAdminDto[] = [
    {
      id: 'th-1',
      kind: 'COURIER',
      courierId: 'c-1',
      partnerId: null,
      name: 'Nikos Pappas',
      lastMessageAt: '2026-11-17T14:30:00.000Z',
      lastMessage: {
        id: 'msg-1',
        threadId: 'th-1',
        senderKind: 'COURIER',
        senderName: 'Nikos Pappas',
        body: 'At the restaurant now',
        deliveryId: 'del-12345678',
        orderReference: 'ORD-99',
        createdAt: '2026-11-17T14:30:00.000Z',
      },
      linkedDeliveryId: 'del-12345678',
      linkedOrderReference: 'ORD-99',
      unread: true,
    },
    {
      id: 'th-2',
      kind: 'PARTNER',
      courierId: null,
      partnerId: 'p-1',
      name: 'Pizza Mia',
      lastMessageAt: '2026-11-17T14:25:00.000Z',
      lastMessage: {
        id: 'msg-2',
        threadId: 'th-2',
        senderKind: 'DISPATCH',
        senderName: 'Maria',
        body: 'Rider is arriving in 3 mins',
        deliveryId: 'del-87654321',
        orderReference: null,
        createdAt: '2026-11-17T14:25:00.000Z',
      },
      linkedDeliveryId: 'del-87654321',
      linkedOrderReference: null,
      unread: false,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockLive = true
    mockPageVisible = true
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 1 } })
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: sampleThreads,
        pagination: { currentPage: 1, totalPages: 1, totalItems: 2, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the four tabs (Unread, Couriers, Restaurants, All) and defaults to ALL (decision 111.7)', () => {
    render(<ThreadList activeThreadId={null} />)

    expect(screen.getByRole('tab', { name: /Unread/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Couriers/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Restaurants/i })).toBeInTheDocument()
    const allTab = screen.getByRole('tab', { name: /All/i })
    expect(allTab).toBeInTheDocument()
    expect(allTab).toHaveAttribute('data-state', 'active')

    // Initial query uses tab: 'ALL'
    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'ALL', page: 1 }),
      expect.anything()
    )
  })

  it('shows unread count badge on the Unread tab trigger when unread count > 0', () => {
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 3 } })
    render(<ThreadList activeThreadId={null} />)

    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    expect(unreadTab).toHaveTextContent('3')
  })

  it('switching tabs updates the tab and resets page to 1', () => {
    render(<ThreadList activeThreadId={null} />)

    const couriersTab = screen.getByRole('tab', { name: /Couriers/i })
    fireEvent.mouseDown(couriersTab, { button: 0 })

    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'COURIERS', page: 1 }),
      expect.anything()
    )
  })

  it('search input debounces typing by 300ms, sends trimmed search parameter, and resets page to 1', () => {
    render(<ThreadList activeThreadId={null} />)

    const searchInput = screen.getByLabelText('Search conversations')
    expect(searchInput).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '  Nikos  ' } })

    // Before timer advances, query not yet called with search
    expect(mockUseGetChatThreadsQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Nikos' }),
      expect.anything()
    )

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Nikos', page: 1 }),
      expect.anything()
    )
  })

  it('rows display name, role, linked order, last message with "You:" prefix for dispatch, and unread dot (never a number per thread, AC-20)', () => {
    render(<ThreadList activeThreadId="th-1" />)

    // Row 1: Courier thread with linked order ORD-99 and unread mark
    const nikosLink = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(nikosLink).toHaveAttribute('href', '/chat/th-1')
    expect(nikosLink).toHaveAttribute('aria-current', 'page')
    expect(nikosLink).toHaveAttribute('data-unread', 'true')

    expect(screen.getByText('Courier · #ORD-99')).toBeInTheDocument()
    expect(screen.getByText('At the restaurant now')).toBeInTheDocument()

    // Unread mark: a dot with sr-only "Unread", never a message count number (AC-20)
    const unreadDot = within(nikosLink).getByText('Unread')
    expect(unreadDot).toBeInTheDocument()
    expect(unreadDot.parentElement).toHaveClass('rounded-full bg-destructive')
    expect(unreadDot.parentElement?.textContent).toBe('Unread')
    // Verify there is NO numeric count on the thread row
    expect(within(nikosLink).queryByText('1 unread')).toBeNull()

    // Row 2: Restaurant thread with dispatch's last message -> prefixed "You:"
    const pizzaLink = screen.getByRole('link', { name: /Pizza Mia/i })
    expect(pizzaLink).toHaveAttribute('href', '/chat/th-2')
    expect(pizzaLink).toHaveAttribute('data-unread', 'false')

    // Uses short delivery ID when orderReference is null: #del-87654321 -> #654321
    expect(screen.getByText('Restaurant · #654321')).toBeInTheDocument()
    expect(screen.getByText('You: Rider is arriving in 3 mins')).toBeInTheDocument()
  })

  it('an unread thread row renders an unread mark and fails if any number appears outside name, time, order code and message text (AC-20, value 5)', () => {
    // Contract & AC-20: Nothing counts one person's messages; a thread gets an unread mark, never a number.
    // Red count bubbles (like the board image mockup) were ruled out.
    render(<ThreadList activeThreadId="th-1" />)

    const unreadRow = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(unreadRow).toHaveAttribute('data-unread', 'true')

    // 1. The unread dot itself contains only sr-only "Unread" - never a count number or bubble
    const unreadDot = within(unreadRow).getByText('Unread')
    expect(unreadDot.parentElement).toHaveClass('rounded-full bg-destructive')
    expect(unreadDot.parentElement?.textContent).toBe('Unread')

    // 2. Strip the allowed fields that can legitimately carry numbers (name, time, order code, message body)
    // plus initials, role, and "Unread", and assert that no digits remain anywhere in the row.
    // The first sample thread, checked once so the reads below need no `!` each.
    const first = sampleThreads[0]
    if (!first) throw new Error('sample thread missing')
    let nonDataText = unreadRow.textContent || ''
    nonDataText = nonDataText.replace(first.name, '')
    nonDataText = nonDataText.replace(initials(first.name), '')
    nonDataText = nonDataText.replace(threadTime(first.lastMessageAt), '')
    nonDataText = nonDataText.replace(roleLabel(first.kind), '')
    nonDataText = nonDataText.replace(orderLabel(first.linkedOrderReference, first.linkedDeliveryId)!, '')
    nonDataText = nonDataText.replace(first.lastMessage!.body, '')
    nonDataText = nonDataText.replace('Unread', '')

    expect(nonDataText).not.toMatch(/\d/)

    // 3. Also verify with an unread thread containing no numbers in its data (no time, order or numeric text)
    const plainUnreadThread: ChatThreadRowAdminDto = {
      id: 'th-unread-no-numbers',
      kind: 'COURIER',
      courierId: 'c-plain',
      partnerId: null,
      name: 'Courier Andreas',
      lastMessageAt: null,
      lastMessage: {
        id: 'msg-plain',
        threadId: 'th-unread-no-numbers',
        senderKind: 'COURIER',
        senderName: 'Courier Andreas',
        body: 'Waiting outside',
        deliveryId: null,
        orderReference: null,
        createdAt: '2026-11-17T14:30:00.000Z',
      },
      linkedDeliveryId: null,
      linkedOrderReference: null,
      unread: true,
    }

    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [plainUnreadThread],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
    })

    const { unmount } = render(<ThreadList activeThreadId={null} />)
    const plainRow = screen.getByRole('link', { name: /Courier Andreas/i })
    expect(plainRow).toHaveAttribute('data-unread', 'true')

    // Since this thread's name, time, order and message have no numbers, the entire row
    // text outside "Unread" must be completely free of numbers.
    const remainingText = (plainRow.textContent || '').replace('Unread', '')
    expect(remainingText).not.toMatch(/\d/)
    unmount()
  })

  it('polls every 30 s (THREAD_LIST_POLL_MS) when live is false and page is visible; does not poll when live is true', () => {
    // When live is false and pageVisible is true
    mockLive = false
    mockPageVisible = true
    const { rerender } = render(<ThreadList activeThreadId={null} />)

    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: THREAD_LIST_POLL_MS })
    )

    // When live is true
    mockLive = true
    rerender(<ThreadList activeThreadId={null} />)

    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: 0 })
    )
  })

  it('handles empty state and displays contextual tab message', () => {
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null } },
      isLoading: false,
      isError: false,
    })

    render(<ThreadList activeThreadId={null} />)
    expect(
      screen.getByText(/No conversations yet. A courier or restaurant who writes to dispatch shows up here./i)
    ).toBeInTheDocument()
  })

  it('handles error state gracefully', () => {
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    render(<ThreadList activeThreadId={null} />)
    expect(
      screen.getByText(/Conversations can't be reached right now. They will load again on their own./i)
    ).toBeInTheDocument()
  })

  it('supports pagination controls when totalPages > 1', () => {
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: sampleThreads,
        pagination: { currentPage: 1, totalPages: 3, totalItems: 150, prevPage: null, nextPage: 2 },
      },
      isLoading: false,
      isError: false,
    })

    render(<ThreadList activeThreadId={null} />)

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    const newerBtn = screen.getByRole('button', { name: 'Newer' })
    const olderBtn = screen.getByRole('button', { name: 'Older' })

    expect(newerBtn).toBeDisabled()
    expect(olderBtn).toBeEnabled()

    fireEvent.click(olderBtn)
    expect(mockUseGetChatThreadsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    )
  })
})
