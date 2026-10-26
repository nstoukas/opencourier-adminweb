import React from 'react'
import { render, screen } from '@testing-library/react'
import OrdersPage from '../../pages/deliveries'
import { EnumDeliveryStatus } from '../../shared-types'
import type { DeliveryAdminDto } from '../../backend-admin-sdk'
import { useGetDeliveriesQuery } from '../../api/deliveriesApi'
import { useGetCouriersQuery } from '../../api/couriersApi'

// Mock DefaultLayout to avoid requiring full Redux store provider in list page tests
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock admin page navigator
const mockGoToDeliveryDetails = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToDeliveryDetails: mockGoToDeliveryDetails,
  }),
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/deliveries',
    push: jest.fn(),
  }),
}))

// Mock RTK Query deliveriesApi endpoints used by OrdersPage and AssignCourierCell
jest.mock('../../api/deliveriesApi', () => ({
  useGetDeliveriesQuery: jest.fn(),
  useAssignDeliveryToCourierMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
}))

// Mock RTK Query couriersApi endpoints used for courier name lookup and assignment dropdown
jest.mock('../../api/couriersApi', () => ({
  useGetCouriersQuery: jest.fn(),
  useGetAllCouriersQuery: jest.fn().mockReturnValue({ data: [], isLoading: false }),
}))

const mockUseGetDeliveriesQuery = useGetDeliveriesQuery as jest.Mock
const mockUseGetCouriersQuery = useGetCouriersQuery as jest.Mock

describe('Deliveries list page (OrdersPage) Offer column wiring & polling (spec 0002, AC-11)', () => {
  const fixedNow = new Date('2026-10-26T12:00:00.000Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)
    jest.clearAllMocks()

    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c1', firstName: 'Ana', lastName: 'Papadopoulou' }],
      },
      isLoading: false,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders Offer column header and rows for open offer and waiting state (AC-11)', () => {
    // Delivery 1: Holding an open offer (offered 2 min ago)
    const openOfferDelivery: DeliveryAdminDto = {
      id: 'del-open',
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: 'c1',
      matchedCourierName: 'Ana Papadopoulou',
      offeredAt: new Date(fixedNow.getTime() - 120_000), // 2 min ago
      offerExpiresAt: new Date(fixedNow.getTime() + 60_000),
      waitingForCourierSince: null,
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Delivery 2: Waiting with nobody offered (waiting since 4 min ago)
    const waitingDelivery: DeliveryAdminDto = {
      id: 'del-waiting',
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: new Date(fixedNow.getTime() - 240_000), // 4 min ago
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Delivery 3: Accepted delivery (should display nothing in Offer column)
    const acceptedDelivery: DeliveryAdminDto = {
      id: 'del-accepted',
      status: EnumDeliveryStatus.ACCEPTED,
      courierId: 'c1',
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: null,
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [openOfferDelivery, waitingDelivery, acceptedDelivery],
        pagination: { totalItems: 3, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    // Offer column header is present in the table
    expect(screen.getByRole('columnheader', { name: 'Offer' })).toBeInTheDocument()

    // Row 1 finds 'Ana P., 2 min' style text
    expect(screen.getByText('Ana P., 2 min')).toBeInTheDocument()

    // Row 2 finds 'No rider free, 4 min' style text
    expect(screen.getByText('No rider free, 4 min')).toBeInTheDocument()

    // Status badges are rendered for all rows
    expect(screen.getAllByText('Assigning Courier').length).toBe(2)
    expect(screen.getByText('Accepted')).toBeInTheDocument()

    // Regression guard (F5): Courier column shows a dash while looking for a rider,
    // never the old 'Waiting for response from courier' label
    expect(screen.queryByText(/Waiting for response from courier/i)).toBeNull()

    const rows = screen.getAllByRole('row')
    // Row 0 is table header; rows 1..3 are data rows
    const offeredRow = rows[1]
    const waitingRow = rows[2]
    const acceptedRow = rows[3]

    // Offered row: Offer column shows rider & duration; Courier column shows dash
    expect(offeredRow).toHaveTextContent('Ana P., 2 min')
    expect(offeredRow).toHaveTextContent('—')

    // Waiting row: Offer column shows 'No rider free, 4 min'; Courier column shows dash
    expect(waitingRow).toHaveTextContent('No rider free, 4 min')
    expect(waitingRow).toHaveTextContent('—')

    // Accepted row: Courier column shows accepted rider full name
    expect(acceptedRow).toHaveTextContent('Ana Papadopoulou')
  })

  it('renders pre-migration open offer with shortened name only and empty cell for unassigned delivery without waiting time', () => {
    // Untimed open offer: offeredAt is null
    const untimedOfferDelivery: DeliveryAdminDto = {
      id: 'del-untimed',
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: 'c1',
      matchedCourierName: 'Ana Papadopoulou',
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: null,
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Assigning courier but matching has not reported nobody free yet
    const initialAssigningDelivery: DeliveryAdminDto = {
      id: 'del-initial',
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: null,
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [untimedOfferDelivery, initialAssigningDelivery],
        pagination: { totalItems: 2, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    // Displays shortened rider name without time
    expect(screen.getByText('Ana P.')).toBeInTheDocument()
    // No waiting text is rendered
    expect(screen.queryByText(/No rider free/)).toBeNull()
  })

  it('refreshes the deliveries list every 30 seconds via pollingInterval (spec 0002, AC-11)', () => {
    mockUseGetDeliveriesQuery.mockReturnValue({
      data: { data: [], pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 1 } },
      isLoading: false,
    })

    render(<OrdersPage />)

    // The query must be configured with a 30s pollingInterval (30000 ms) so offers age and update automatically
    expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: 30_000 })
    )
  })

  it('stops polling (pollingInterval: 0) while the tab is hidden / in background (F6, decision 61.52)', () => {
    const visibilitySpy = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: { data: [], pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 1 } },
      isLoading: false,
    })

    render(<OrdersPage />)

    expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: 0 })
    )

    visibilitySpy.mockRestore()
  })
})
