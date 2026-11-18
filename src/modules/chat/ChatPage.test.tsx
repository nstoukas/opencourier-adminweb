import React from 'react'
import { render, screen } from '@testing-library/react'
import { ChatPage } from './ChatPage'

// Mock DefaultLayout to verify fillViewport and avoid layout dependencies
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children, fillViewport }: { children: React.ReactNode; fillViewport?: boolean }) => (
    <div data-testid="default-layout" data-fill-viewport={String(fillViewport)}>
      {children}
    </div>
  ),
}))

// Mock child components to isolate ChatPage layout and responsive structure
jest.mock('./ThreadList', () => ({
  ThreadList: ({ activeThreadId }: { activeThreadId: string | null }) => (
    <div data-testid="thread-list" data-active-thread-id={activeThreadId ?? 'none'}>
      ThreadList Mock
    </div>
  ),
}))

jest.mock('./Conversation', () => ({
  Conversation: ({ threadId }: { threadId: string }) => (
    <div data-testid="conversation" data-thread-id={threadId}>
      Conversation Mock
    </div>
  ),
}))

describe('ChatPage (spec 0034, AC-2, decisions 111.7, 111.10)', () => {
  it('renders one h1 "Messages" and passes fillViewport to DefaultLayout', () => {
    render(<ChatPage threadId={null} />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Messages')

    const layout = screen.getByTestId('default-layout')
    expect(layout).toHaveAttribute('data-fill-viewport', 'true')
  })

  it('when threadId is null: shows inbox section and displays conversation prompt on large screens', () => {
    render(<ChatPage threadId={null} />)

    const conversationsSection = screen.getByRole('region', { name: 'Conversations' })
    expect(conversationsSection).toBeInTheDocument()
    expect(conversationsSection.className).toContain('flex')
    expect(conversationsSection.className).not.toContain('hidden')

    // ThreadList rendered with null activeThreadId
    const threadList = screen.getByTestId('thread-list')
    expect(threadList).toHaveAttribute('data-active-thread-id', 'none')

    const conversationSection = screen.getByRole('region', { name: 'Conversation' })
    expect(conversationSection).toBeInTheDocument()
    // Hidden on mobile, flex on lg
    expect(conversationSection.className).toContain('hidden lg:flex')

    // Empty state prompt visible
    expect(
      screen.getByText(/Choose a conversation to read and answer it/i)
    ).toBeInTheDocument()
    expect(screen.queryByTestId('conversation')).toBeNull()
  })

  it('when threadId is provided: hides inbox on mobile, displays Conversation component', () => {
    render(<ChatPage threadId="th-volos-42" />)

    const conversationsSection = screen.getByRole('region', { name: 'Conversations' })
    // On mobile hidden, visible on lg screens
    expect(conversationsSection.className).toContain('hidden lg:flex')

    const threadList = screen.getByTestId('thread-list')
    expect(threadList).toHaveAttribute('data-active-thread-id', 'th-volos-42')

    const conversationSection = screen.getByRole('region', { name: 'Conversation' })
    expect(conversationSection.className).toContain('flex')
    expect(conversationSection.className).not.toContain('hidden lg:flex')

    // Renders Conversation for the thread
    const conversation = screen.getByTestId('conversation')
    expect(conversation).toHaveAttribute('data-thread-id', 'th-volos-42')
  })

  it('h1 accessibility (Minor 4): exactly one h1 when threadId is null; with thread open, an h1 "Messages" exists outside display:none ancestors with sr-only lg:hidden', () => {
    // 1. With no thread open: exactly one h1
    const { unmount } = render(<ChatPage threadId={null} />)
    const headingsNoThread = screen.getAllByRole('heading', { level: 1 })
    expect(headingsNoThread).toHaveLength(1)
    expect(headingsNoThread[0]).toHaveTextContent('Messages')
    unmount()

    // 2. With a thread open: an h1 "Messages" exists that is not inside a display:none ancestor at narrow width (sr-only lg:hidden)
    render(<ChatPage threadId="th-volos-42" />)
    const headingsWithThread = screen.getAllByRole('heading', { level: 1 })
    const narrowH1 = headingsWithThread.find((h) => h.classList.contains('sr-only'))

    expect(narrowH1).toBeDefined()
    expect(narrowH1).toHaveTextContent('Messages')
    expect(narrowH1).toHaveClass('sr-only', 'lg:hidden')
    // Crucially: it is NOT inside an ancestor that has "hidden" (such as the inbox section)
    expect(narrowH1?.closest('.hidden')).toBeNull()
  })

  it('fills viewport height at every width: inner container uses h-full and min-h-0 with no lg: prefix (verify fixes)', () => {
    const { container } = render(<ChatPage threadId={null} />)
    // The main wrapper holding inbox and conversation fills viewport at every width
    const innerWrapper = container.querySelector('.flex.h-full.min-h-0')
    expect(innerWrapper).toBeInTheDocument()
    expect(innerWrapper?.className).toContain('h-full')
    expect(innerWrapper?.className).toContain('min-h-0')
    expect(innerWrapper?.className).not.toContain('lg:h-full')
    expect(innerWrapper?.className).not.toContain('min-h-[calc(100dvh-3.5rem)]')
  })
})
