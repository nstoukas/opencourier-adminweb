import React from 'react'
import { render, screen } from '@testing-library/react'
import { SplitRequestsBadge, SPLIT_COUNT_POLL_MS } from './SplitRequestsBadge'

const mockUseGetSplitRequestCountQuery = jest.fn()
jest.mock('../../api/splitRequestApi', () => ({
  useGetSplitRequestCountQuery: (arg: any, opts: any) => mockUseGetSplitRequestCountQuery(arg, opts),
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

const mockPlayChatSound = jest.fn()
jest.mock('../chat/chatSound', () => ({
  playChatSound: () => mockPlayChatSound(),
}))

// Spec 0047 (AC-4, cross check 14): the sidebar's count of open split requests, and the sound that
// tells an admin a rider has just flagged an order, so it is not missed for ten minutes.
describe('SplitRequestsBadge (spec 0047, AC-4, cross check 14)', () => {
  // Draws the badge with this count, as the next poll would.
  const withCount = (open: number) => mockUseGetSplitRequestCountQuery.mockReturnValue({ data: { open } })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
  })

  describe('the count', () => {
    it('shows nothing when no request is open', () => {
      withCount(0)
      const { container } = render(<SplitRequestsBadge />)
      expect(container.firstChild).toBeNull()
    })

    it('shows the number of open requests, in red, with words for a screen reader', () => {
      withCount(3)
      render(<SplitRequestsBadge />)

      const badge = screen.getByRole('img', { name: '3 waiting for an answer' })
      expect(badge).toHaveTextContent('3')
      expect(badge).toHaveAttribute('title', '3 waiting for an answer')
      // Always red: a rider is standing at a restaurant until someone answers.
      expect(badge).toHaveClass('bg-destructive')
    })

    it('shows the figure the server sent, not a figure of its own', () => {
      withCount(17)
      render(<SplitRequestsBadge />)
      expect(screen.getByRole('img', { name: '17 waiting for an answer' })).toHaveTextContent('17')
    })

    it('shows "?" when the count could not be read, never a wrong 0', () => {
      mockUseGetSplitRequestCountQuery.mockReturnValue({ data: undefined, isError: true })
      render(<SplitRequestsBadge />)

      const badge = screen.getByRole('img', { name: 'Open split requests could not be counted' })
      expect(badge).toHaveTextContent('?')
    })

    it('keeps the last count on screen when a later poll fails', () => {
      mockUseGetSplitRequestCountQuery.mockReturnValue({ data: { open: 2 }, isError: true })
      render(<SplitRequestsBadge />)
      expect(screen.getByRole('img', { name: '2 waiting for an answer' })).toHaveTextContent('2')
    })
  })

  describe('polling', () => {
    it('asks every 15 seconds while the page is visible', () => {
      withCount(1)
      render(<SplitRequestsBadge />)

      expect(SPLIT_COUNT_POLL_MS).toBe(15_000)
      expect(mockUseGetSplitRequestCountQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ pollingInterval: SPLIT_COUNT_POLL_MS })
      )
    })

    // Row 11 review: the sound exists for an admin on another tab, so the count is asked there too.
    it('keeps asking every 15 seconds while the page is in the background', () => {
      mockPageVisible = false
      withCount(1)
      render(<SplitRequestsBadge />)

      expect(mockUseGetSplitRequestCountQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ pollingInterval: SPLIT_COUNT_POLL_MS })
      )
      expect(mockUseGetSplitRequestCountQuery).not.toHaveBeenCalledWith(undefined, expect.objectContaining({ pollingInterval: 0 }))
    })

    it('plays the sound for a request that arrives while the page is in the background', () => {
      mockPageVisible = false
      withCount(0)
      const { rerender } = render(<SplitRequestsBadge />)

      withCount(1)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('the sound plays only when the count rises (cross check 14)', () => {
    it('is silent on the first load, even with requests already open', () => {
      withCount(2)
      render(<SplitRequestsBadge />)
      expect(mockPlayChatSound).not.toHaveBeenCalled()
    })

    it('plays once when the count goes up', () => {
      withCount(1)
      const { rerender } = render(<SplitRequestsBadge />)

      withCount(2)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).toHaveBeenCalledTimes(1)
    })

    it('plays when the first request arrives (0 to 1)', () => {
      withCount(0)
      const { rerender } = render(<SplitRequestsBadge />)
      expect(mockPlayChatSound).not.toHaveBeenCalled()

      withCount(1)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).toHaveBeenCalledTimes(1)
    })

    it('is silent when the count stays the same', () => {
      withCount(2)
      const { rerender } = render(<SplitRequestsBadge />)

      withCount(2)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).not.toHaveBeenCalled()
    })

    it('is silent when the count goes down (a request was answered)', () => {
      withCount(3)
      const { rerender } = render(<SplitRequestsBadge />)

      withCount(1)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).not.toHaveBeenCalled()
    })

    it('plays again for a new request after the count fell: 2, 1, then 2', () => {
      withCount(2)
      const { rerender } = render(<SplitRequestsBadge />)
      withCount(1)
      rerender(<SplitRequestsBadge />)
      expect(mockPlayChatSound).not.toHaveBeenCalled()

      withCount(2)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).toHaveBeenCalledTimes(1)
    })

    it('is silent while the count has not loaded yet, and on the load that follows', () => {
      mockUseGetSplitRequestCountQuery.mockReturnValue({ data: undefined })
      const { rerender } = render(<SplitRequestsBadge />)

      withCount(4)
      rerender(<SplitRequestsBadge />)

      expect(mockPlayChatSound).not.toHaveBeenCalled()
    })
  })
})
