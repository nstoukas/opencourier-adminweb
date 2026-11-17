import React from 'react'
import { render, screen } from '@testing-library/react'
import { MessagesBadge, UNREAD_COUNT_POLL_MS } from './MessagesBadge'

const mockUseGetChatUnreadCountQuery = jest.fn()
jest.mock('../../api/chatApi', () => ({
  useGetChatUnreadCountQuery: (arg: any, opts: any) => mockUseGetChatUnreadCountQuery(arg, opts),
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

let mockLive = false
jest.mock('./ChatLive', () => ({
  useChatLive: () => mockLive,
}))

const mockPlayChatSound = jest.fn()
jest.mock('./chatSound', () => ({
  playChatSound: () => mockPlayChatSound(),
}))

describe('MessagesBadge (spec 0034, AC-2, AC-9)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
    mockLive = false
  })

  it('renders nothing when count is 0 (hidden at 0, AC-2)', () => {
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 0 } })
    const { container } = render(<MessagesBadge />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByLabelText(/unread/i)).toBeNull()
  })

  it('renders badge with count and aria-label when count > 0', () => {
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 5 } })
    render(<MessagesBadge />)

    const badge = screen.getByLabelText('5 unread')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('5')
    expect(badge).toHaveClass('rounded-full bg-destructive')
  })

  it('plays sound when count rises only while live connection is off (!live, AC-9)', () => {
    mockLive = false

    // Initial render with count = 1: should NOT play sound
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 1 } })
    const { rerender } = render(<MessagesBadge />)
    expect(mockPlayChatSound).not.toHaveBeenCalled()

    // Count rises to 3 while live is false: plays sound once
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 3 } })
    rerender(<MessagesBadge />)
    expect(mockPlayChatSound).toHaveBeenCalledTimes(1)

    // Count stays at 3: does not play sound
    rerender(<MessagesBadge />)
    expect(mockPlayChatSound).toHaveBeenCalledTimes(1)

    // Count decreases to 2: does not play sound
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 2 } })
    rerender(<MessagesBadge />)
    expect(mockPlayChatSound).toHaveBeenCalledTimes(1)
  })

  it('does NOT play sound when count rises while live connection is ON (live = true, AC-9)', () => {
    mockLive = true

    // Initial render with count = 1
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 1 } })
    const { rerender } = render(<MessagesBadge />)

    // Count rises to 2 while live is true: MessagesBadge stays quiet
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 2 } })
    rerender(<MessagesBadge />)

    expect(mockPlayChatSound).not.toHaveBeenCalled()
  })

  it('polls with UNREAD_COUNT_POLL_MS (30 s) when page is visible, 0 when page is hidden', () => {
    mockPageVisible = true
    mockUseGetChatUnreadCountQuery.mockReturnValue({ data: { count: 0 } })
    const { rerender } = render(<MessagesBadge />)

    expect(mockUseGetChatUnreadCountQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ pollingInterval: UNREAD_COUNT_POLL_MS })
    )

    mockPageVisible = false
    rerender(<MessagesBadge />)

    expect(mockUseGetChatUnreadCountQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ pollingInterval: 0 })
    )
  })
})
