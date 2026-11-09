import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { DispatchPage } from './DispatchPage'
import { useGetDispatchBoardQuery } from '../../api/dispatchBoardApi'
import { useGetInstanceConfigQuery } from '../../api/configApi'
import { usePageVisible } from '../../hooks/usePageVisible'
import type { DispatchBoardDto } from '@/backend-admin-sdk'
import { DeliveryAdminDtoStatusEnum } from '@/backend-admin-sdk'

jest.mock('next/dynamic', () => () => {
  return function MockDispatchMap({ map }: any) {
    return <div data-testid="dispatch-map" data-couriers-count={map?.couriers?.length} />
  }
})

jest.mock('../../api/dispatchBoardApi', () => ({
  useGetDispatchBoardQuery: jest.fn(),
}))

jest.mock('../../api/deliveriesApi', () => ({
  useMarkDeliveryIssueHandledMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
  useAssignDeliveryToCourierMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
}))

jest.mock('../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(() => ({ data: [], isLoading: false })),
}))

jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigQuery: jest.fn(),
}))

jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: jest.fn(),
}))

const mockUseGetDispatchBoardQuery = useGetDispatchBoardQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock
const mockUsePageVisible = usePageVisible as jest.Mock

describe('DispatchPage (spec 0034, AC-1, AC-2, AC-11, AC-15, AC-16)', () => {
  const mockRefetch = jest.fn()

  const defaultBoardData: DispatchBoardDto = {
    generatedAt: '2026-11-09T14:30:00.000Z',
    cards: {
      active: { total: 5, toPickup: 3, toDropoff: 2 },
      waiting: { total: 2, oldestWaitingMinutes: 14 },
      couriers: { total: 6, busy: 4, free: 2, lastCall: 0 },
      deliveredToday: { total: 18, medianMinutes: 28 },
    },
    attention: [
      {
        id: 'row-1',
        kind: 'WAITING_FOR_RIDER',
        since: '2026-11-09T14:16:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'ORD1',
        restaurantName: 'Grill',
        riderName: null,
        customerLabel: 'Maria',
        detail: 'Looking for a courier',
        held: false,
      },
    ],
    attentionMore: 0,
    map: {
      couriers: [
        {
          id: 'c1',
          name: 'Courier 1',
          latitude: 39.36,
          longitude: 22.94,
          state: 'BUSY',
          carrying: [],
        },
      ],
      waitingDeliveries: [],
    },
    dispatchStop: { active: false, until: null },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: { details: { region: { type: 'Polygon', coordinates: [] } } },
    })
    mockUseGetDispatchBoardQuery.mockReturnValue({
      data: defaultBoardData,
      isError: false,
      refetch: mockRefetch,
      fulfilledTimeStamp: Date.now(),
    })
  })

  describe('AC-1: Page header, title, and navigation', () => {
    it('renders exactly one h1 "Dispatch", the "live, updated N s ago" subtitle, and All Deliveries link', () => {
      render(<DispatchPage />)

      // Exactly one h1 with text Dispatch
      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('Dispatch')

      // Subtitle line
      expect(screen.getByText(/live, updated \d+ s ago/)).toBeInTheDocument()

      // "All Deliveries" button links to /deliveries
      const allDeliveriesLink = screen.getByRole('link', { name: 'All Deliveries' })
      expect(allDeliveriesLink).toHaveAttribute('href', '/deliveries')
    })

    it('reads "live, updated 40 s ago" on the very first render when fulfilledTimeStamp is 40 seconds in the past', () => {
      jest.useFakeTimers()
      const baseTime = new Date('2026-11-09T14:30:40.000Z').getTime()
      jest.setSystemTime(baseTime)

      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: defaultBoardData,
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: baseTime - 40_000,
      })

      render(<DispatchPage />)

      // Must read 40 s ago on the very first render, never 0 s
      expect(screen.getByText('live, updated 40 s ago')).toBeInTheDocument()
      expect(screen.queryByText('live, updated 0 s ago')).toBeNull()

      jest.useRealTimers()
    })
  })

  describe('AC-2: Four totals cards', () => {
    it('renders server figures for all 4 cards correctly with waiting card tinted when waiting > 0', () => {
      render(<DispatchPage />)

      // 1. Active deliveries card
      const activeCard = screen.getByTestId('stat-Active deliveries')
      expect(activeCard).toHaveTextContent('5')
      expect(activeCard).toHaveTextContent('3 to pickup · 2 to dropoff')

      // 2. Waiting for a courier card (total 2 > 0 -> tinted with bg-warning-soft)
      const waitingCard = screen.getByTestId('stat-Waiting for a courier')
      expect(waitingCard).toHaveTextContent('2')
      expect(waitingCard).toHaveTextContent('Oldest waiting 14 min')
      expect(waitingCard).toHaveClass('bg-warning-soft')

      // 3. Couriers online card
      const couriersCard = screen.getByTestId('stat-Couriers online')
      expect(couriersCard).toHaveTextContent('6')
      expect(couriersCard).toHaveTextContent('4 busy · 2 free · 0 on Last Call')

      // 4. Delivered today card
      const deliveredCard = screen.getByTestId('stat-Delivered today')
      expect(deliveredCard).toHaveTextContent('18')
      expect(deliveredCard).toHaveTextContent('Median 28 min door to door')
    })

    it('waiting card has NO warning tint and shows "Nothing waiting" when waiting is 0', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          cards: {
            ...defaultBoardData.cards,
            waiting: { total: 0, oldestWaitingMinutes: null },
          },
        },
        isError: false,
        refetch: mockRefetch,
      })

      render(<DispatchPage />)

      const waitingCard = screen.getByTestId('stat-Waiting for a courier')
      expect(waitingCard).toHaveTextContent('0')
      expect(waitingCard).toHaveTextContent('Nothing waiting')
      expect(waitingCard).not.toHaveClass('bg-warning-soft')
    })

    it('delivered today card shows "No deliveries yet" when medianMinutes is null', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          cards: {
            ...defaultBoardData.cards,
            deliveredToday: { total: 0, medianMinutes: null },
          },
        },
        isError: false,
        refetch: mockRefetch,
      })

      render(<DispatchPage />)

      const deliveredCard = screen.getByTestId('stat-Delivered today')
      expect(deliveredCard).toHaveTextContent('0')
      expect(deliveredCard).toHaveTextContent('No deliveries yet')
    })
  })

  describe('AC-11: Map legend and Live map card', () => {
    it('renders Live map card header with Free, Busy, and Waiting legend items', () => {
      render(<DispatchPage />)

      expect(screen.getByText('Live map')).toBeInTheDocument()

      const legend = screen.getByRole('list', { name: 'Map legend' })
      expect(legend).toBeInTheDocument()
      expect(legend).toHaveTextContent('Free')
      expect(legend).toHaveTextContent('Busy')
      expect(legend).toHaveTextContent('Waiting')
    })
  })

  describe('AC-15: Polling, visibility, and empty/error states', () => {
    it('shows skeleton and no alert when there is no data and no error', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: undefined,
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: undefined,
      })

      render(<DispatchPage />)

      expect(screen.getByTestId('dispatch-skeleton')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByText("Can't reach the server")).toBeNull()
    })

    it('shows alert reading "Can\'t reach the server" and no skeleton when there is no data and isError is true', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: undefined,
        isError: true,
        refetch: mockRefetch,
        fulfilledTimeStamp: undefined,
      })

      render(<DispatchPage />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent("Can't reach the server")
      expect(alert).toHaveTextContent('Trying again every 10 seconds.')
      expect(screen.queryByTestId('dispatch-skeleton')).toBeNull()
    })

    it('passes pollingInterval of 10000 ms when page is visible, and 0 ms when hidden', () => {
      // 1. Tab visible
      mockUsePageVisible.mockReturnValue(true)
      const { rerender } = render(<DispatchPage />)

      expect(mockUseGetDispatchBoardQuery).toHaveBeenCalledWith(undefined, {
        pollingInterval: 10_000,
        refetchOnMountOrArgChange: true,
      })

      // 2. Tab hidden
      mockUsePageVisible.mockReturnValue(false)
      rerender(<DispatchPage />)

      expect(mockUseGetDispatchBoardQuery).toHaveBeenCalledWith(undefined, {
        pollingInterval: 0,
        refetchOnMountOrArgChange: true,
      })
    })

    it('calls useGetDispatchBoardQuery with refetchOnMountOrArgChange: true', () => {
      render(<DispatchPage />)
      expect(mockUseGetDispatchBoardQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ refetchOnMountOrArgChange: true }),
      )
    })

    it('triggers immediate refetch when tab comes back from background', () => {
      // Initially tab is visible and loads data
      mockUsePageVisible.mockReturnValue(true)
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: defaultBoardData,
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: undefined,
      })
      const { rerender } = render(<DispatchPage />)

      expect(mockRefetch).not.toHaveBeenCalled()

      // Data arrives with fulfilledTimeStamp
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: defaultBoardData,
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: Date.now(),
      })
      rerender(<DispatchPage />)

      expect(mockRefetch).not.toHaveBeenCalled()

      // User hides tab
      mockUsePageVisible.mockReturnValue(false)
      rerender(<DispatchPage />)

      // User returns to tab: immediately refetches rather than waiting 10 s
      mockUsePageVisible.mockReturnValue(true)
      rerender(<DispatchPage />)

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it('renders "No riders working right now" when map.couriers is empty', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          map: { couriers: [], waitingDeliveries: [] },
        },
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: Date.now(),
      })

      render(<DispatchPage />)

      expect(screen.getByText('No riders working right now')).toBeInTheDocument()
    })

    it('keeps last good data on poll error and turns to "Can\'t reach the server" past 30 s', () => {
      jest.useFakeTimers()
      const baseTime = new Date('2026-11-09T14:30:00.000Z').getTime()
      jest.setSystemTime(baseTime)

      // Initial successful load
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: defaultBoardData,
        isError: false,
        refetch: mockRefetch,
        fulfilledTimeStamp: baseTime,
      })

      const { rerender } = render(<DispatchPage />)

      expect(screen.getByText('live, updated 0 s ago')).toBeInTheDocument()
      expect(screen.getByTestId('stat-Active deliveries')).toHaveTextContent('5')

      // Subsequent poll fails: RTK Query keeps previous data, but sets isError: true
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: defaultBoardData,
        isError: true,
        refetch: mockRefetch,
        fulfilledTimeStamp: baseTime,
      })

      rerender(<DispatchPage />)

      // Data is still on screen (not replaced by error screen or blank)
      expect(screen.getByTestId('stat-Active deliveries')).toHaveTextContent('5')

      // Advance 10 seconds: error has lasted 10s <= 30s -> keeps counting seconds
      act(() => {
        jest.advanceTimersByTime(10_000)
      })

      expect(screen.getByText('live, updated 10 s ago')).toBeInTheDocument()

      // Advance past 30 seconds (total 35s): reads "Can't reach the server"
      act(() => {
        jest.advanceTimersByTime(25_000)
      })

      expect(screen.getByText("Can't reach the server")).toBeInTheDocument()

      // Data still remains on screen!
      expect(screen.getByTestId('stat-Active deliveries')).toHaveTextContent('5')

      jest.useRealTimers()
    })
  })

  describe('AC-16: Dispatch stop alert', () => {
    it('renders Alert "Dispatch is stopped" with formatted Athens until time when stop is active', () => {
      // 14:00 UTC generatedAt, 16:00 UTC until. In November (EET, UTC+2), 16:00 UTC is 18:00 in Athens.
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          generatedAt: '2026-11-09T14:00:00.000Z',
          dispatchStop: {
            active: true,
            until: '2026-11-09T16:00:00.000Z',
          },
        },
        isError: false,
        refetch: mockRefetch,
      })

      render(<DispatchPage />)

      expect(screen.getByText('Dispatch is stopped')).toBeInTheDocument()
      expect(screen.getByText('Until 18:00.')).toBeInTheDocument()
    })

    it('renders Alert with "Until an admin restarts it." when until is null', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          dispatchStop: {
            active: true,
            until: null,
          },
        },
        isError: false,
        refetch: mockRefetch,
      })

      render(<DispatchPage />)

      expect(screen.getByText('Dispatch is stopped')).toBeInTheDocument()
      expect(screen.getByText('Until an admin restarts it.')).toBeInTheDocument()
    })

    it('does not render dispatch stop Alert when active is false', () => {
      mockUseGetDispatchBoardQuery.mockReturnValue({
        data: {
          ...defaultBoardData,
          dispatchStop: {
            active: false,
            until: null,
          },
        },
        isError: false,
        refetch: mockRefetch,
      })

      render(<DispatchPage />)

      expect(screen.queryByText('Dispatch is stopped')).toBeNull()
    })
  })
})
