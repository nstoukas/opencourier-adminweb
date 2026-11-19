import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReviewsBadge, REVIEW_COUNT_POLL_MS } from './ReviewsBadge'

const mockUseGetReviewRequestCountQuery = jest.fn()
jest.mock('../../api/reviewRequestApi', () => ({
  useGetReviewRequestCountQuery: (arg: any, opts: any) => mockUseGetReviewRequestCountQuery(arg, opts),
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

describe('ReviewsBadge (spec 0038, AC-5)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
  })

  it('renders nothing when open count is 0', () => {
    mockUseGetReviewRequestCountQuery.mockReturnValue({
      data: { open: 0, overdue: 0 },
    })

    const { container } = render(<ReviewsBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders neutral badge when open requests exist but none are overdue', () => {
    mockUseGetReviewRequestCountQuery.mockReturnValue({
      data: { open: 3, overdue: 0 },
    })

    render(<ReviewsBadge />)

    const badge = screen.getByLabelText('3 open')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('3')
    expect(badge).toHaveAttribute('title', '3 open')
    // Secondary styling (neutral, not red)
    expect(badge).toHaveClass('bg-secondary')
    expect(badge).not.toHaveClass('bg-destructive')
  })

  it('renders red destructive badge when at least one open request is overdue', () => {
    mockUseGetReviewRequestCountQuery.mockReturnValue({
      data: { open: 4, overdue: 1 },
    })

    render(<ReviewsBadge />)

    const badge = screen.getByLabelText('4 open, 1 overdue')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('4')
    expect(badge).toHaveAttribute('title', '4 open, 1 overdue')
    // Red destructive styling
    expect(badge).toHaveClass('bg-destructive')
    expect(badge).not.toHaveClass('bg-secondary')
  })

  it('polls every 30 seconds while page is visible', () => {
    mockPageVisible = true
    mockUseGetReviewRequestCountQuery.mockReturnValue({
      data: { open: 2, overdue: 0 },
    })

    render(<ReviewsBadge />)

    expect(mockUseGetReviewRequestCountQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ pollingInterval: REVIEW_COUNT_POLL_MS })
    )
    expect(REVIEW_COUNT_POLL_MS).toBe(30_000)
  })

  it('stops polling (pollingInterval: 0) when page is in background', () => {
    mockPageVisible = false
    mockUseGetReviewRequestCountQuery.mockReturnValue({
      data: { open: 2, overdue: 0 },
    })

    render(<ReviewsBadge />)

    expect(mockUseGetReviewRequestCountQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ pollingInterval: 0 })
    )
  })
})
