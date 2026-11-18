import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatRoutePage from '@/pages/chat/[[...threadId]]'

// Mock DefaultLayout to avoid unnecessary UI noise
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock Conversation so we can easily check threadId
jest.mock('./Conversation', () => ({
  Conversation: ({ threadId }: { threadId: string }) => (
    <div data-testid="conversation" data-thread-id={threadId}>
      Conversation Mock: {threadId}
    </div>
  ),
}))

let mockRouterQuery: Record<string, any> = {}
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: mockRouterQuery,
  }),
}))

const mockUseGetChatThreadsQuery = jest.fn()
const mockUseGetChatUnreadCountQuery = jest.fn()

jest.mock('../../api/chatApi', () => ({
  useGetChatThreadsQuery: (args: any, opts: any) => mockUseGetChatThreadsQuery(args, opts),
  useGetChatUnreadCountQuery: () => mockUseGetChatUnreadCountQuery(),
}))

jest.mock('./ChatLive', () => ({
  useChatLive: () => true,
}))

jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => true,
}))

describe('ChatRoutePage ([[...threadId]]) (spec 0034, Minor 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouterQuery = {}
    mockUseGetChatThreadsQuery.mockReturnValue({
      data: { data: [], pagination: { total: 0, pages: 1, current: 1 } },
      isLoading: false,
      isError: false,
    })
    mockUseGetChatUnreadCountQuery.mockReturnValue({
      data: { count: 0 },
    })
  })

  it('renders the inbox when there is no threadId segment (/chat)', () => {
    mockRouterQuery = {}
    render(<ChatRoutePage />)

    // Conversation is not opened, prompt to select is displayed
    expect(screen.queryByTestId('conversation')).toBeNull()
    expect(screen.getByText(/Choose a conversation to read and answer it/i)).toBeInTheDocument()
  })

  it('renders the conversation thread when there is one segment (/chat/<id>)', () => {
    mockRouterQuery = { threadId: ['th-volos-42'] }
    render(<ChatRoutePage />)

    const conversation = screen.getByTestId('conversation')
    expect(conversation).toBeInTheDocument()
    expect(conversation).toHaveAttribute('data-thread-id', 'th-volos-42')
  })

  it('/chat/a/b (two segments) falls back to showing the inbox without opening a thread', () => {
    mockRouterQuery = { threadId: ['a', 'b'] }
    render(<ChatRoutePage />)

    expect(screen.queryByTestId('conversation')).toBeNull()
    expect(screen.getByText(/Choose a conversation to read and answer it/i)).toBeInTheDocument()
  })

  it('moving from /chat to /chat/<id> keeps the inbox selected tab and search text (no remount of inbox state)', () => {
    mockRouterQuery = {}
    const { rerender } = render(<ChatRoutePage />)

    // Select the "Couriers" tab
    const couriersTab = screen.getByRole('tab', { name: /Couriers/i })
    fireEvent.keyDown(couriersTab, { key: 'Enter' })
    expect(couriersTab).toHaveAttribute('data-state', 'active')

    // Type into the search input
    const searchInput = screen.getByRole('searchbox', { name: /Search conversations/i })
    fireEvent.change(searchInput, { target: { value: 'Nikos Pappas' } })
    expect(searchInput).toHaveValue('Nikos Pappas')

    // Navigate to /chat/th-volos-42 by changing router query and re-rendering the same page component
    mockRouterQuery = { threadId: ['th-volos-42'] }
    rerender(<ChatRoutePage />)

    // Verify inbox state was preserved without remounting
    expect(searchInput).toHaveValue('Nikos Pappas')
    expect(screen.getByRole('tab', { name: /Couriers/i })).toHaveAttribute('data-state', 'active')
    // And the conversation is now rendered
    expect(screen.getByTestId('conversation')).toHaveAttribute('data-thread-id', 'th-volos-42')
  })
})
