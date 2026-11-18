import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { ThreadList, THREAD_LIST_POLL_MS, withKeptThread } from './ThreadList'
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

// Helper to construct test threads with sensible defaults
function makeThread(overrides: Partial<ChatThreadRowAdminDto> = {}): ChatThreadRowAdminDto {
  return {
    id: 'th-default',
    kind: 'COURIER',
    courierId: 'c-1',
    partnerId: null,
    name: 'Courier Default',
    lastMessageAt: '2026-11-17T12:00:00.000Z',
    lastMessage: {
      id: 'msg-default',
      threadId: 'th-default',
      senderKind: 'COURIER',
      senderName: 'Courier Default',
      body: 'Hello',
      deliveryId: null,
      orderReference: null,
      createdAt: '2026-11-17T12:00:00.000Z',
    },
    linkedDeliveryId: null,
    linkedOrderReference: null,
    unread: true,
    ...overrides,
  }
}

describe('withKeptThread (row 115 pure logic)', () => {
  it('returns the list unchanged when kept is null', () => {
    const listed = [makeThread({ id: 't1' })]
    const result = withKeptThread(listed, null)
    expect(result).toBe(listed)
  })

  it('returns the list unchanged when the list already contains the kept thread id', () => {
    const listed = [makeThread({ id: 't1' }), makeThread({ id: 't2' })]
    const kept = makeThread({ id: 't1', unread: true })
    const result = withKeptThread(listed, kept)
    expect(result).toBe(listed)
  })

  it('inserts the kept row at the beginning (first position) when its timestamp is newest', () => {
    const t1 = makeThread({ id: 't1', lastMessageAt: '2026-11-17T14:00:00.000Z' })
    const t2 = makeThread({ id: 't2', lastMessageAt: '2026-11-17T12:00:00.000Z' })
    const kept = makeThread({ id: 'kept-newest', lastMessageAt: '2026-11-17T16:00:00.000Z', unread: true })

    const result = withKeptThread([t1, t2], kept)

    expect(result.map((t) => t.id)).toEqual(['kept-newest', 't1', 't2'])
    expect(result[0]?.unread).toBe(false)
  })

  it('inserts the kept row in the middle position when its timestamp is between threads', () => {
    const t1 = makeThread({ id: 't1', lastMessageAt: '2026-11-17T16:00:00.000Z' })
    const t2 = makeThread({ id: 't2', lastMessageAt: '2026-11-17T12:00:00.000Z' })
    const kept = makeThread({ id: 'kept-middle', lastMessageAt: '2026-11-17T14:00:00.000Z', unread: true })

    const result = withKeptThread([t1, t2], kept)

    expect(result.map((t) => t.id)).toEqual(['t1', 'kept-middle', 't2'])
    expect(result[1]?.unread).toBe(false)
  })

  it('inserts the kept row at the end (last position) when its timestamp is oldest', () => {
    const t1 = makeThread({ id: 't1', lastMessageAt: '2026-11-17T16:00:00.000Z' })
    const t2 = makeThread({ id: 't2', lastMessageAt: '2026-11-17T14:00:00.000Z' })
    const kept = makeThread({ id: 'kept-oldest', lastMessageAt: '2026-11-17T10:00:00.000Z', unread: true })

    const result = withKeptThread([t1, t2], kept)

    expect(result.map((t) => t.id)).toEqual(['t1', 't2', 'kept-oldest'])
    expect(result[2]?.unread).toBe(false)
  })

  it('inserts the kept row into an empty list as a single thread with unread false', () => {
    const kept = makeThread({ id: 'kept-single', lastMessageAt: '2026-11-17T10:00:00.000Z', unread: true })
    const result = withKeptThread([], kept)

    expect(result.map((t) => t.id)).toEqual(['kept-single'])
    expect(result[0]?.unread).toBe(false)
  })

  it('always sets unread: false on the kept row even if kept.unread was true', () => {
    const kept = makeThread({ id: 'kept-unread', unread: true })
    const result = withKeptThread([], kept)

    expect(result[0]?.unread).toBe(false)
  })

  it('handles null lastMessageAt gracefully by placing it after threads with timestamps', () => {
    const t1 = makeThread({ id: 't1', lastMessageAt: '2026-11-17T12:00:00.000Z' })
    const kept = makeThread({ id: 'kept-null-time', lastMessageAt: null, unread: true })

    const result = withKeptThread([t1], kept)

    expect(result.map((t) => t.id)).toEqual(['t1', 'kept-null-time'])
    expect(result[1]?.unread).toBe(false)
  })

  it('does not mutate the input array or the kept thread object', () => {
    const t1 = makeThread({ id: 't1', lastMessageAt: '2026-11-17T12:00:00.000Z' })
    const listed = Object.freeze([t1]) as ChatThreadRowAdminDto[]
    const kept = Object.freeze(makeThread({ id: 'kept-1', unread: true })) as ChatThreadRowAdminDto

    const result = withKeptThread(listed, kept)

    expect(result).not.toBe(listed)
    expect(kept.unread).toBe(true)
    expect(result[1]?.unread).toBe(false)
  })
})

describe('ThreadList kept thread on Unread tab (row 115, decision 115.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockLive = true
    mockPageVisible = true
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 1 } })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Helper setting up the state where t1 is opened, searched on Unread tab, and then read (server returns [])
  function setupKeptThreadOnUnread(t1: ChatThreadRowAdminDto, activeThreadId = 't1') {
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
    })

    const view = render(<ThreadList activeThreadId={activeThreadId} />)

    // Switch to UNREAD tab
    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    fireEvent.mouseDown(unreadTab, { button: 0 })

    // Type search and advance the 300 ms debounce timer
    const searchInput = screen.getByLabelText('Search conversations')
    fireEvent.change(searchInput, { target: { value: 'Nikos' } })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Server returns search results containing t1
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t1],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
    })
    view.rerender(<ThreadList activeThreadId={activeThreadId} />)

    // Now simulate open thread t1 being read: server returns []
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
    })
    view.rerender(<ThreadList activeThreadId={activeThreadId} />)

    return { ...view, searchInput, unreadTab }
  }

  it('keeps active thread in view as read when server drops it from Unread tab with search typed', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    setupKeptThreadOnUnread(t1, 't1')

    // t1 must STILL be rendered in the document
    const keptRow = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(keptRow).toBeInTheDocument()

    // t1 must be shown as read: data-unread="false" and no unread dot indicator
    expect(keptRow).toHaveAttribute('data-unread', 'false')
    expect(within(keptRow).queryByText('Unread')).toBeNull()

    // "No conversation matches" must NOT appear
    expect(screen.queryByText(/No conversation matches/i)).toBeNull()
  })

  it('drops the kept thread and shows the empty search message when search text changes', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    const { searchInput } = setupKeptThreadOnUnread(t1, 't1')
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // Now change search to a different query
    fireEvent.change(searchInput, { target: { value: 'Andreas' } })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Kept row is dropped and empty message appears
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
    expect(screen.getByText('No conversation matches “Andreas”.')).toBeInTheDocument()
  })

  it('drops the kept thread when switching from Unread to another tab', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    setupKeptThreadOnUnread(t1, 't1')
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // Switch to Couriers tab
    const couriersTab = screen.getByRole('tab', { name: /Couriers/i })
    fireEvent.mouseDown(couriersTab, { button: 0 })

    // Kept row is dropped
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
    expect(screen.getByText('No conversation matches “Nikos”.')).toBeInTheDocument()
  })

  it('drops the kept thread once another thread is opened (activeThreadId changes)', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    const { rerender } = setupKeptThreadOnUnread(t1, 't1')
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // Open another thread (activeThreadId changes to t2)
    rerender(<ThreadList activeThreadId="t2" />)

    // Kept row t1 is dropped
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
    expect(screen.getByText('No conversation matches “Nikos”.')).toBeInTheDocument()
  })

  it('does not add kept thread on the ALL tab: with t1 open and the server listing t2 only, t1 is not added', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })
    const t2 = makeThread({
      id: 't2',
      name: 'Pizza Mia',
      unread: false,
      lastMessageAt: '2026-11-17T14:25:00.000Z',
    })

    // On default ALL tab, server initially lists t1 so it is active
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t1],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    const { rerender } = render(<ThreadList activeThreadId="t1" />)
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // Server now lists t2 only while t1 remains open
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t2],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    rerender(<ThreadList activeThreadId="t1" />)

    // t2 is listed, but t1 is NOT added on the ALL tab
    expect(screen.getByRole('link', { name: /Pizza Mia/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
  })

  it('tab round trip: remembers kept thread on Unread with search typed when switching to All and back', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })
    const t2 = makeThread({
      id: 't2',
      name: 'Pizza Mia',
      unread: false,
      lastMessageAt: '2026-11-17T14:25:00.000Z',
    })

    // Setup: Unread tab, search "Nikos" typed, t1 open and listed, then server drops it (kept, shown as read)
    const { rerender } = setupKeptThreadOnUnread(t1, 't1')
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toHaveAttribute('data-unread', 'false')

    // Switch to All tab (server lists t2 only)
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t2],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    const allTab = screen.getByRole('tab', { name: /All/i })
    fireEvent.mouseDown(allTab, { button: 0 })

    // On All tab: t2 is shown, t1 is NOT added
    expect(screen.getByRole('link', { name: /Pizza Mia/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()

    // Switch back to Unread tab with same search and page (server still not listing t1, t1 still open)
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    fireEvent.mouseDown(unreadTab, { button: 0 })

    // Back on Unread: t1 IS shown again, as read (kept row remembered tab, search and page)
    const keptOnReturn = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(keptOnReturn).toBeInTheDocument()
    expect(keptOnReturn).toHaveAttribute('data-unread', 'false')

    // Then open another thread t2: t1 is no longer shown
    rerender(<ThreadList activeThreadId="t2" />)
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
  })

  it('going back to a cached search: keeps thread when returning to cached search and server drops it', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    // Cached response holding the exact same array and row object reference as RTK Query cache gives
    const cachedNoshData = [t1]

    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })

    const { rerender } = render(<ThreadList activeThreadId="t1" />)

    // Switch to Unread tab
    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    fireEvent.mouseDown(unreadTab, { button: 0 })

    const searchInput = screen.getByLabelText('Search conversations')

    // 1. Search "nosh" lists t1 (open)
    fireEvent.change(searchInput, { target: { value: 'nosh' } })
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: cachedNoshData,
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // 2. Change search to "x" (t1 not listed)
    fireEvent.change(searchInput, { target: { value: 'x' } })
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()

    // 3. Change search back to "nosh" where mock answer is SAME array and row object
    fireEvent.change(searchInput, { target: { value: 'nosh' } })
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: cachedNoshData,
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // 4. Server drops t1 (read): t1 must still be shown as read
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    rerender(<ThreadList activeThreadId="t1" />)

    const keptRow = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(keptRow).toBeInTheDocument()
    expect(keptRow).toHaveAttribute('data-unread', 'false')
    expect(within(keptRow).queryByText('Unread')).toBeNull()
    expect(screen.queryByText(/No conversation matches/i)).toBeNull()
  })

  it('page change: t1 kept on page 1 is not shown on page 2', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    // On Unread tab, page 1 lists t1 with totalPages: 2, nextPage: 2
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t1],
        pagination: { currentPage: 1, totalPages: 2, totalItems: 60, prevPage: null, nextPage: 2 },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })

    const { rerender } = render(<ThreadList activeThreadId="t1" />)

    // Switch to Unread tab
    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    fireEvent.mouseDown(unreadTab, { button: 0 })
    expect(screen.getByRole('link', { name: /Nikos Pappas/i })).toBeInTheDocument()

    // Server drops t1 (read), still on page 1: t1 is kept on page 1
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 2, totalItems: 59, prevPage: null, nextPage: 2 },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    rerender(<ThreadList activeThreadId="t1" />)

    const keptOnPage1 = screen.getByRole('link', { name: /Nikos Pappas/i })
    expect(keptOnPage1).toBeInTheDocument()
    expect(keptOnPage1).toHaveAttribute('data-unread', 'false')

    // Go to page 2 (click "Older", with pagination totalPages 2 and nextPage set)
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 2, totalPages: 2, totalItems: 59, prevPage: 1, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })

    const olderBtn = screen.getByRole('button', { name: 'Older' })
    expect(olderBtn).toBeEnabled()
    fireEvent.click(olderBtn)

    // t1 is NOT shown on page 2
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
  })

  it('stale data while fetching: does not save kept thread under new search while isFetching is true', () => {
    const t1 = makeThread({
      id: 't1',
      name: 'Nikos Pappas',
      unread: true,
      lastMessageAt: '2026-11-17T14:30:00.000Z',
    })

    // Start on Unread tab without t1 listed
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })

    const { rerender } = render(<ThreadList activeThreadId="t1" />)

    // Switch to Unread tab
    const unreadTab = screen.getByRole('tab', { name: /Unread/i })
    fireEvent.mouseDown(unreadTab, { button: 0 })

    // User types new search "acme"
    const searchInput = screen.getByLabelText('Search conversations')
    fireEvent.change(searchInput, { target: { value: 'acme' } })

    // While fetching new search, mock returns isFetching: true with stale answer containing t1
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [t1],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: true,
    })

    // Advance 300 ms debounce timer so search parameter updates to "acme"
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Fetch ends with answer without t1 (isFetching: false)
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, prevPage: null, nextPage: null },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    })
    rerender(<ThreadList activeThreadId="t1" />)

    // After fetch ends with answer without t1, t1 is not shown
    expect(screen.queryByRole('link', { name: /Nikos Pappas/i })).toBeNull()
    expect(screen.getByText('No conversation matches “acme”.')).toBeInTheDocument()
  })
})
