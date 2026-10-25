import React from 'react'
import { render, screen } from '@testing-library/react'
import ChatPage from '../../pages/chat'

// Mock DefaultLayout to isolate ChatPage content without needing Redux provider or navigation hooks
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

describe('Chat page (src/pages/chat/index.tsx)', () => {
  it('renders without crashing and displays the placeholder "Messages are not available yet."', () => {
    render(<ChatPage />)

    // Verify DefaultLayout container wraps the card
    expect(screen.getByTestId('default-layout')).toBeInTheDocument()

    // Verify Messages title
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeInTheDocument()

    // Verify placeholder text per scope row 93 Done-when clause
    expect(screen.getByText('Messages are not available yet.')).toBeInTheDocument()
  })
})
