import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeWorkedPage } from './TimeWorkedPage'
import { useGetTimeWorkedTotalsQuery } from '../../api/timeWorkedApi'
import { EAdminRoutes } from '../../hooks/useAdminPageNavigator'

jest.mock('../../api/timeWorkedApi', () => ({
  useGetTimeWorkedTotalsQuery: jest.fn(),
}))

const mockPush = jest.fn()
let mockRouter = {
  pathname: '/time-worked',
  query: {} as Record<string, string>,
  isReady: true,
  push: mockPush,
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

describe('TimeWorkedPage (spec 0040, AC-14, AC-16)', () => {
  const mockUseGetTimeWorkedTotalsQuery = useGetTimeWorkedTotalsQuery as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      pathname: '/time-worked',
      query: { from: '2026-11-01', to: '2026-11-20', by: 'day' },
      isReady: true,
      push: mockPush,
    }
  })

  it('skips the totals query until router.isReady', () => {
    mockRouter.isReady = false
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    expect(mockUseGetTimeWorkedTotalsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ by: 'day' }),
      { skip: true }
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('calls the totals query with range and by from router query', () => {
    mockRouter.query = { from: '2026-11-01', to: '2026-11-15', by: 'week' }
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: {
        currencyCode: 'EUR',
        rows: [],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    expect(mockUseGetTimeWorkedTotalsQuery).toHaveBeenCalledWith(
      { from: '2026-11-01', to: '2026-11-15', by: 'week' },
      { skip: false }
    )
    expect(screen.getByText('No days in this range.')).toBeInTheDocument()
  })

  it('renders a row per period with riders who worked, the split, unpaid share, money, unlinked money and per hour', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: {
        currencyCode: 'EUR',
        rows: [
          {
            period: '2026-11-19',
            riderCount: 5,
            workSeconds: 18000, // 5 h 00 min
            jobSeconds: 10800, // 3 h 00 min
            paidWaitSeconds: 1800, // 30 min
            unpaidSeconds: 5400, // 1 h 30 min
            moneyCents: 6500, // €65.00
            unlinkedMoneyCents: 500, // €5.00
            centsPerHour: 1200, // €12.00
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // riders who worked
    expect(screen.getByText('5 h 00 min')).toBeInTheDocument() // time worked
    expect(screen.getByText('3 h 00 min')).toBeInTheDocument() // jobs
    expect(screen.getByText('30 min')).toBeInTheDocument() // paid wait
    expect(screen.getByText('1 h 30 min')).toBeInTheDocument() // unpaid
    expect(screen.getByText('30%')).toBeInTheDocument() // 5400 / 18000 = 30% unpaid share
    expect(screen.getByText('€65.00')).toBeInTheDocument() // money
    expect(screen.getByText('€5.00')).toBeInTheDocument() // not in recorded shift
    expect(screen.getByText('€12.00')).toBeInTheDocument() // per hour
  })

  it('labels periods as "Week of …" when grouped by week', () => {
    mockRouter.query = { from: '2026-11-01', to: '2026-11-20', by: 'week' }
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: {
        currencyCode: 'EUR',
        rows: [
          {
            period: '2026-11-16',
            riderCount: 7,
            workSeconds: 36000,
            jobSeconds: 24000,
            paidWaitSeconds: 3600,
            unpaidSeconds: 8400,
            moneyCents: 15000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1500,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    expect(screen.getByText('Week of 16 Nov 2026')).toBeInTheDocument()
  })

  it('pushes the new query to /time-worked when DayRangeForm changes range', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: { currencyCode: 'EUR', rows: [] },
      isLoading: false,
    })

    render(<TimeWorkedPage />)

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const showButton = screen.getByRole('button', { name: 'Show' })

    fireEvent.change(fromInput, { target: { value: '2026-11-05' } })
    fireEvent.change(toInput, { target: { value: '2026-11-12' } })
    fireEvent.click(showButton)

    expect(mockPush).toHaveBeenCalledWith({
      pathname: EAdminRoutes.TIME_WORKED,
      query: { from: '2026-11-05', to: '2026-11-12', by: 'day' },
    })
  })

  it('pushes the new query when switching between day and week tabs', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: { currencyCode: 'EUR', rows: [] },
      isLoading: false,
    })

    render(<TimeWorkedPage />)

    const weekTab = screen.getByRole('tab', { name: 'By week' })
    fireEvent.mouseDown(weekTab, { button: 0 })

    expect(mockPush).toHaveBeenCalledWith({
      pathname: EAdminRoutes.TIME_WORKED,
      query: { from: '2026-11-01', to: '2026-11-20', by: 'week' },
    })
  })

  it('reads currentData and does not render stale rows when new range query is in flight', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      data: {
        currencyCode: 'EUR',
        rows: [
          {
            period: '2026-11-19',
            riderCount: 99,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 1000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1000,
          },
        ],
      },
      currentData: undefined, // New range requested, cache has old data but currentData is undefined
      isLoading: false,
      isFetching: true,
    })

    render(<TimeWorkedPage />)

    // Should display loading and NOT show previous 99 riders row
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('99')).not.toBeInTheDocument()
    expect(screen.queryByText('Thu, 19 Nov 2026')).not.toBeInTheDocument()
  })

  it('ensures no element carries a rider id, rider name, or link to a rider page (AC-16)', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: {
        currencyCode: 'EUR',
        rows: [
          {
            period: '2026-11-19',
            riderCount: 3,
            workSeconds: 7200,
            jobSeconds: 3600,
            paidWaitSeconds: 0,
            unpaidSeconds: 3600,
            moneyCents: 2400,
            unlinkedMoneyCents: 0,
            centsPerHour: 1200,
            // Even if backend payload leaked extra keys
            courierId: 'courier-leak-12345',
            riderName: 'Secret Rider Name',
          } as any,
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    const { container } = render(<TimeWorkedPage />)

    expect(screen.queryByText(/courier-leak-12345/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Secret Rider Name/)).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain('courier-leak-12345')
    expect(container.innerHTML).not.toContain('Secret Rider Name')

    // No links anywhere on the page point to a courier route
    const allLinks = screen.queryAllByRole('link')
    for (const link of allLinks) {
      expect(link.getAttribute('href')).not.toContain('/couriers')
    }
  })

  it('displays a problem alert when range in query is invalid or exceeds maxDays', () => {
    mockRouter.query = { from: '2026-11-20', to: '2026-11-10', by: 'day' } // from > to
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: { currencyCode: 'EUR', rows: [] },
      isLoading: false,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The first day must be on or before the last day. Showing the last 28 days instead.')
  })

  it('shows part week note under a cut week row and none under a whole week row (decision 36.49)', () => {
    // Range from Sat 2026-11-07 to Fri 2026-11-20
    mockRouter.query = { from: '2026-11-07', to: '2026-11-20', by: 'week' }
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: {
        currencyCode: 'EUR',
        rows: [
          // Period 2026-11-02 (Monday): Sunday is 2026-11-08. Range starts on Saturday 2026-11-07.
          // Cut at the start: Sat 7 Nov to Sun 8 Nov.
          {
            period: '2026-11-02',
            riderCount: 4,
            workSeconds: 14400,
            jobSeconds: 7200,
            paidWaitSeconds: 0,
            unpaidSeconds: 7200,
            moneyCents: 5000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1250,
          },
          // Period 2026-11-09 (Monday): Sunday is 2026-11-15. Fully inside 2026-11-07 to 2026-11-20.
          {
            period: '2026-11-09',
            riderCount: 8,
            workSeconds: 28800,
            jobSeconds: 14400,
            paidWaitSeconds: 0,
            unpaidSeconds: 14400,
            moneyCents: 10000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1250,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<TimeWorkedPage />)

    // Part week note appears under the cut week
    expect(screen.getByText('part of the week: Sat 7 Nov to Sun 8 Nov')).toBeInTheDocument()

    // Only one part week note in document (the full week has none)
    expect(screen.getAllByText(/part of the week/)).toHaveLength(1)
  })

  it('renders error state showing "Could not load the time worked."', () => {
    mockUseGetTimeWorkedTotalsQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isError: true,
    })

    render(<TimeWorkedPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load the time worked.')
  })
})
