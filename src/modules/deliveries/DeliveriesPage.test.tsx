import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('Deliveries list page (OrdersPage) (spec 0011, AC-1)', () => {
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

  it('renders Deliveries title (h1), redesign table columns, and removes status select and search box', () => {
    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    // Heading "Deliveries" (h1)
    expect(screen.getByRole('heading', { level: 1, name: 'Deliveries' })).toBeInTheDocument()

    // Table column headers per AC-1
    expect(screen.getByRole('columnheader', { name: 'Order' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Restaurant' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Deliver to' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Courier' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Price' })).toBeInTheDocument()

    // Old Offer column header is NOT present
    expect(screen.queryByRole('columnheader', { name: 'Offer' })).toBeNull()

    // Obsolete status select and search input are removed (filtered nothing on backend)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull()
  })

  it('renders rows with Order, StatusBadge, Restaurant, Deliver to, Courier, Price, and row Action', () => {
    // Delivery 1: Holding an open offer (offered 2 min ago), awaits assignment
    const openOfferDelivery: DeliveryAdminDto = {
      id: 'del-open-123456',
      orderReference: 'ORD-REF-1',
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: 'c1',
      matchedCourierName: 'Ana Papadopoulou',
      offeredAt: new Date(fixedNow.getTime() - 120_000), // 2 min ago
      offerExpiresAt: new Date(fixedNow.getTime() + 60_000),
      waitingForCourierSince: null,
      pickupBusinessName: 'Souvlaki Bar',
      dropoffName: 'Giannis S.',
      totalCost: 1550, // €15.50
      currencyCode: 'EUR',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Delivery 2: Waiting with nobody offered, awaits assignment, price is null before first offer
    const waitingDelivery: DeliveryAdminDto = {
      id: 'del-wait-789abc',
      orderReference: null,
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: new Date(fixedNow.getTime() - 240_000), // 4 min ago
      pickupBusinessName: null,
      dropoffName: null,
      totalCost: null,
      currencyCode: 'EUR',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Delivery 3: Accepted delivery with known courier, not awaiting assignment
    const acceptedDelivery: DeliveryAdminDto = {
      id: 'del-acc-def456',
      orderReference: 'ORD-REF-3',
      status: EnumDeliveryStatus.ACCEPTED,
      courierId: 'c1',
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: null,
      pickupBusinessName: 'Pizza Mia',
      dropoffName: 'Elena P.',
      totalCost: 2000,
      currencyCode: 'EUR',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    // Delivery 4: Dispatched with unknown courierId not in lookup map
    const unknownCourierDelivery: DeliveryAdminDto = {
      id: 'del-unk-999999',
      orderReference: 'ORD-REF-4',
      status: EnumDeliveryStatus.DISPATCHED,
      courierId: 'courier-unknown-id',
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      offerExpiresAt: null,
      waitingForCourierSince: null,
      pickupBusinessName: 'Burger Lab',
      dropoffName: 'Nikos K.',
      totalCost: 850,
      currencyCode: 'EUR',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [openOfferDelivery, waitingDelivery, acceptedDelivery, unknownCourierDelivery],
        pagination: { totalItems: 4, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    const rows = screen.getAllByRole('row')
    // Row 0 is header; Rows 1..4 are data rows
    const row1 = rows[1] as HTMLElement
    const row2 = rows[2] as HTMLElement
    const row3 = rows[3] as HTMLElement
    const row4 = rows[4] as HTMLElement

    // Row 1 assertions:
    // Order: orderReference 'ORD-REF-1' and shortId '123456' with full id in title
    expect(row1).toHaveTextContent('ORD-REF-1')
    expect(row1).toHaveTextContent('123456')
    const shortId1 = row1.querySelector('span[title="del-open-123456"]')
    expect(shortId1).not.toBeNull()
    expect(shortId1?.textContent).toBe('123456')
    // Status: Assigning Courier
    expect(row1).toHaveTextContent('Assigning Courier')
    // Restaurant & Deliver to
    expect(row1).toHaveTextContent('Souvlaki Bar')
    expect(row1).toHaveTextContent('Giannis S.')
    // Courier: OfferSummary text while ASSIGNING_COURIER
    expect(row1).toHaveTextContent('Ana P., 2 min')
    // Price: formatted totalCost
    expect(row1).toHaveTextContent('€15.50')
    // Action: "Assign courier" button while awaiting assignment
    const assignBtn1 = row1.querySelector('button')
    expect(assignBtn1?.textContent).toContain('Assign courier')

    // Row 2 assertions (null fallbacks):
    // Order: '—' for orderReference, and shortId '789ABC' with full id in title
    expect(row2).toHaveTextContent('789ABC')
    const shortId2 = row2.querySelector('span[title="del-wait-789abc"]')
    expect(shortId2).not.toBeNull()
    expect(shortId2?.textContent).toBe('789ABC')
    // Courier: 'No rider free, 4 min'
    expect(row2).toHaveTextContent('No rider free, 4 min')
    // Price: '—' when totalCost is null
    expect(row2).toHaveTextContent('—')
    // Action: "Assign courier" button
    const assignBtn2 = row2.querySelector('button')
    expect(assignBtn2?.textContent).toContain('Assign courier')

    // Row 3 assertions (accepted):
    expect(row3).toHaveTextContent('ORD-REF-3')
    expect(row3).toHaveTextContent('Accepted')
    expect(row3).toHaveTextContent('Pizza Mia')
    expect(row3).toHaveTextContent('Elena P.')
    // Courier: accepted rider full name from lookup
    expect(row3).toHaveTextContent('Ana Papadopoulou')
    expect(row3).toHaveTextContent('€20.00')
    // Action: "Open" button (not awaiting assignment)
    const openBtn3 = row3.querySelector('button')
    expect(openBtn3?.textContent).toContain('Open')

    // Row 4 assertions (unknown courier):
    expect(row4).toHaveTextContent('Dispatched')
    // Courier: displays id in mono when not in lookup map
    const courierMonoSpan = screen.getByText('courier-unknown-id')
    expect(courierMonoSpan).toBeInTheDocument()
    expect(courierMonoSpan).toHaveClass('font-mono')
    const openBtn4 = row4.querySelector('button')
    expect(openBtn4?.textContent).toContain('Open')
  })

  it('clicking Open button navigates to delivery detail without triggering row click twice', () => {
    const delivery: DeliveryAdminDto = {
      id: 'del-nav-101',
      orderReference: 'ORD-101',
      status: EnumDeliveryStatus.ACCEPTED,
      courierId: 'c1',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [delivery],
        pagination: { totalItems: 1, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    const openBtn = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openBtn)

    expect(mockGoToDeliveryDetails).toHaveBeenCalledTimes(1)
    expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-nav-101')
  })

  it('clicking a table row navigates to delivery detail', () => {
    const delivery: DeliveryAdminDto = {
      id: 'del-row-click-202',
      orderReference: 'ORD-202',
      status: EnumDeliveryStatus.DISPATCHED,
      courierId: 'c1',
      createdAt: new Date('2026-10-26T10:00:00Z'),
    } as any

    mockUseGetDeliveriesQuery.mockReturnValue({
      data: {
        data: [delivery],
        pagination: { totalItems: 1, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<OrdersPage />)

    const rows = screen.getAllByRole('row')
    const dataRow = rows[1] as HTMLElement
    fireEvent.click(dataRow)

    expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-row-click-202')
  })

  it('refreshes the deliveries list every 30 seconds via pollingInterval (spec 0002, AC-11)', () => {
    mockUseGetDeliveriesQuery.mockReturnValue({
      data: { data: [], pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 1 } },
      isLoading: false,
    })

    render(<OrdersPage />)

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
