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
})
