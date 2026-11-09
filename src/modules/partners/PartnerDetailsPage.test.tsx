import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import PartnerDetailsPage from '../../pages/partners/[partnerId]'
import { useGetPartnerQuery } from '../../api/partnersApi'
import { EnumDeliveryStatus } from '@/shared-types'
import type { DeliveryAdminDto, PartnerAdminDto } from '@/backend-admin-sdk'
import { formatDate } from '@/ui-shared-utils'

// Mock DefaultLayout to avoid requiring full layout & nav providers
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock admin page navigator
const mockGoToPartners = jest.fn()
const mockGoToDeliveryDetails = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToPartners: mockGoToPartners,
    goToDeliveryDetails: mockGoToDeliveryDetails,
  }),
}))

// Mock page visibility (the deliveries queries poll only while the page is visible)
const mockUsePageVisible = jest.fn()
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockUsePageVisible(),
}))

// Mock Next.js router
let mockRouter = {
  pathname: '/partners/[partnerId]',
  query: { partnerId: 'partner-abc-123' } as Record<string, string | undefined>,
  push: jest.fn(),
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// The map is loaded through next/dynamic (Leaflet needs window), so it is replaced by a stand in
// that shows the point it was given, as the SOS page's test does (SosIncidentDetails.test.tsx).
jest.mock('next/dynamic', () => () => {
  return function MockPickupPinMap({ latitude, longitude }: { latitude: number; longitude: number }) {
    return <div data-testid="pickup-pin-map" data-lat={latitude} data-lng={longitude} />
  }
})

// Mock RTK Query partnersApi
jest.mock('../../api/partnersApi', () => ({
  useGetPartnerQuery: jest.fn(),
  useDisablePartnerMutation: () => [jest.fn(), { isLoading: false }],
  useEnablePartnerMutation: () => [jest.fn(), { isLoading: false }],
  useGetPartnerAvailabilityChangesQuery: () => ({ data: [], isLoading: false, isError: false }),
}))

const mockUseGetDeliveriesQuery = jest.fn()
jest.mock('../../api/deliveriesApi', () => ({
  useGetDeliveriesQuery: (args: any, options: any) => mockUseGetDeliveriesQuery(args, options),
}))

// Mock child dialogs and customer card to keep tests focused on the page
jest.mock('./components/PartnerCustomersCard', () => ({
  PartnerCustomersCard: ({ partnerId, restaurantName }: { partnerId: string; restaurantName: string }) => (
    <div data-testid="mock-customers-card" data-partner-id={partnerId} data-name={restaurantName} />
  ),
}))
jest.mock('./components/PartnerFormDialog', () => ({
  PartnerFormDialog: ({ open, mode }: { open: boolean; mode: string }) =>
    open ? <div data-testid="mock-partner-form-dialog" data-mode={mode} /> : null,
}))
jest.mock('./components/RotateCredentialsDialog', () => ({
  RotateCredentialsDialog: ({
    open,
    partnerName,
    returnFocusTo,
  }: {
    open: boolean
    partnerName: string
    returnFocusTo?: { current: HTMLElement | null }
  }) =>
    open ? (
      <div
        data-testid="mock-rotate-dialog"
        data-name={partnerName}
        data-return-focus-to={returnFocusTo?.current?.textContent ?? ''}
      />
    ) : null,
}))

const mockUseGetPartnerQuery = useGetPartnerQuery as jest.Mock

const basePartner = {
  id: 'partner-abc-123',
  name: 'Souvlaki Bar',
  email: 'souvlaki@bar.gr',
  phoneNumber: '+302421012345',
  logo: null,
  webhookUrl: 'https://souvlaki.example/hook',
  userId: 'u1',
  pickupAddress: {
    id: 'loc1',
    street: 'Ermou',
    houseNumber: '120',
    city: 'Volos',
    state: 'Thessaly',
    zipCode: '38221',
    countryCode: 'GR',
    latitude: 39.3628,
    longitude: 22.9435,
    formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
    createdAt: new Date('2026-03-15T10:00:00Z'),
    stateCode: null,
  },
  // Mid month, so "Member since" reads the same in every time zone.
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T10:00:00Z'),
} as unknown as PartnerAdminDto

// RTK Query's `data` keeps the last answer for ANY argument; `currentData` is the answer for these
// arguments only. The page reads `currentData`, so the fixtures set it (and `data` only to show it is ignored).
type QueryResult = { currentData?: any; data?: any; isLoading: boolean; isFetching?: boolean; isError: boolean }

describe('Partner details page (spec 0017, AC-7: "See its orders" link)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
    mockUseGetDeliveriesQuery.mockReturnValue({ currentData: undefined, isLoading: false, isError: false })
    mockRouter = {
      pathname: '/partners/[partnerId]',
      query: { partnerId: 'partner-abc-123' },
      push: jest.fn(),
    }
  })

  it('renders a "See its orders" link pointing to /deliveries?partnerId=<id>', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      currentData: {
        id: 'partner-abc-123',
        name: 'Souvlaki Bar',
        email: 'souvlaki@bar.gr',
      },
      isLoading: false,
      isError: false,
    })

    render(<PartnerDetailsPage />)

    // Link in PageHeader action per spec 0017, AC-7
    const ordersLink = screen.getByRole('link', { name: /see its orders/i })
    expect(ordersLink).toBeInTheDocument()
    expect(ordersLink).toHaveAttribute('href', '/deliveries?partnerId=partner-abc-123')
  })

  it('does not render "See its orders" link while loading', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isError: false,
    })

    render(<PartnerDetailsPage />)

    expect(screen.queryByRole('link', { name: /see its orders/i })).toBeNull()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('does not render "See its orders" link when partner is not found or error occurs', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isError: true,
    })

    render(<PartnerDetailsPage />)

    expect(screen.queryByRole('link', { name: /see its orders/i })).toBeNull()
    expect(screen.getByText('Restaurant not found or could not be loaded.')).toBeInTheDocument()
  })
})

describe('Restaurant page (spec 0024, AC-2 to AC-6)', () => {
  let liveResult: QueryResult
  let recentResult: QueryResult

  function delivery(overrides: Partial<DeliveryAdminDto>): DeliveryAdminDto {
    return {
      id: 'del-000000-aaaaaa',
      orderReference: null,
      status: EnumDeliveryStatus.ACCEPTED,
      pickupBusinessName: 'Souvlaki Bar',
      dropoffName: 'Giannis S.',
      createdAt: new Date('2026-10-31T18:05:00.000Z'),
      ...overrides,
    } as unknown as DeliveryAdminDto
  }

  function givenPartner(partner: PartnerAdminDto | undefined, state: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
    mockUseGetPartnerQuery.mockReturnValue({
      currentData: partner,
      isLoading: false,
      isError: false,
      ...state,
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
    mockRouter = {
      pathname: '/partners/[partnerId]',
      query: { partnerId: 'partner-abc-123' },
      push: jest.fn(),
    }
    liveResult = { currentData: { data: [], pagination: { totalItems: 3 } }, isLoading: false, isError: false }
    recentResult = { currentData: { data: [], pagination: { totalItems: 0 } }, isLoading: false, isError: false }
    // A skipped query answers nothing, as RTK Query does; otherwise the active one is told apart by its state.
    mockUseGetDeliveriesQuery.mockImplementation((args: any, options: any) => {
      if (options?.skip) return { currentData: undefined, isLoading: false, isError: false }
      return args?.state === 'active' ? liveResult : recentResult
    })
    givenPartner(basePartner)
  })

  describe('AC-2: header', () => {
    it('shows the breadcrumb "Restaurants › <name>", the name as the only h1, and "Member since <Month YYYY>"', () => {
      render(<PartnerDetailsPage />)

      const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
      const restaurantsLink = within(breadcrumb).getByRole('link', { name: 'Restaurants' })
      expect(restaurantsLink).toHaveAttribute('href', '/partners')
      fireEvent.click(restaurantsLink)
      expect(mockGoToPartners).toHaveBeenCalledTimes(1)
      expect(within(breadcrumb).getByText('Souvlaki Bar')).toHaveAttribute('aria-current', 'page')
      expect(breadcrumb).toHaveTextContent('Restaurants›Souvlaki Bar')

      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('Souvlaki Bar')
      expect(screen.getByText('Member since March 2026')).toBeInTheDocument()

      // The old back button is gone.
      expect(screen.queryByRole('button', { name: /back to restaurants/i })).toBeNull()
    })

    it('has the three buttons: See its orders, Set New Password (opens the rotate dialog) and Edit Details (opens the edit dialog)', () => {
      render(<PartnerDetailsPage />)

      expect(screen.getByRole('link', { name: 'See its orders' })).toHaveAttribute(
        'href',
        '/deliveries?partnerId=partner-abc-123',
      )

      fireEvent.click(screen.getByRole('button', { name: 'Set New Password' }))
      expect(screen.getByTestId('mock-rotate-dialog')).toHaveAttribute('data-name', 'Souvlaki Bar')
      // Focus goes back to the Set New Password button when the dialog closes.
      expect(screen.getByTestId('mock-rotate-dialog')).toHaveAttribute('data-return-focus-to', 'Set New Password')

      fireEvent.click(screen.getByRole('button', { name: 'Edit Details' }))
      expect(screen.getByTestId('mock-partner-form-dialog')).toHaveAttribute('data-mode', 'update')
    })

    it('shows the h1 "Restaurant" and "Loading…" while the restaurant loads, with no breadcrumb', () => {
      givenPartner(undefined, { isLoading: true })

      render(<PartnerDetailsPage />)

      expect(screen.getByRole('heading', { level: 1, name: 'Restaurant' })).toBeInTheDocument()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
    })

    it('shows the h1 "Restaurant" and "Restaurant not found or could not be loaded." on an error', () => {
      givenPartner(undefined, { isError: true })

      render(<PartnerDetailsPage />)

      expect(screen.getByRole('heading', { level: 1, name: 'Restaurant' })).toBeInTheDocument()
      expect(screen.getByText('Restaurant not found or could not be loaded.')).toBeInTheDocument()
      expect(screen.queryByText('Live now')).toBeNull()
    })
    it('with no partnerId yet (the router has not read the URL) shows "Loading…", never "not found" (row 91 review)', () => {
      mockRouter = { pathname: '/partners/[partnerId]', query: {}, push: jest.fn() }
      // The restaurant query is skipped, so it is neither loading nor in error.
      givenPartner(undefined, { isLoading: false, isError: false })

      render(<PartnerDetailsPage />)

      expect(screen.getByRole('heading', { level: 1, name: 'Restaurant' })).toBeInTheDocument()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Restaurant not found or could not be loaded.')).toBeNull()
      expect(mockUseGetPartnerQuery).toHaveBeenCalledWith({ id: '' }, { skip: true, pollingInterval: 30000 })
    })

    it('polls the restaurant query every 30 s while the page is visible', () => {
      mockUsePageVisible.mockReturnValue(true)

      render(<PartnerDetailsPage />)

      expect(mockUseGetPartnerQuery).toHaveBeenCalledWith(
        { id: 'partner-abc-123' },
        { skip: false, pollingInterval: 30000 },
      )
    })

    it('with no partnerId, says "Loading…" even if the skipped query still reports an earlier error', () => {
      mockRouter = { pathname: '/partners/[partnerId]', query: {}, push: jest.fn() }
      givenPartner(undefined, { isLoading: false, isError: true })

      render(<PartnerDetailsPage />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Restaurant not found or could not be loaded.')).toBeNull()
    })
  })

  describe('AC-3: Live now', () => {
    it('shows the server count (pagination.totalItems) from the active query, never the length of its page', () => {
      // One row on the page (perPage 1) but 3 in total: the card must say 3.
      liveResult = {
        currentData: { data: [delivery({ id: 'live-1' })], pagination: { totalItems: 3 } },
        isLoading: false,
        isError: false,
      }

      render(<PartnerDetailsPage />)

      expect(screen.getByText('Live now')).toBeInTheDocument()
      expect(screen.getByTestId('live-now-count')).toHaveTextContent(/^3$/)
      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
        { partnerId: 'partner-abc-123', state: 'active', page: 1, perPage: 1 },
        { skip: false, pollingInterval: 30000 },
      )
    })

    it('shows 0 when the total is 0', () => {
      liveResult = { currentData: { data: [], pagination: { totalItems: 0 } }, isLoading: false, isError: false }

      render(<PartnerDetailsPage />)

      expect(screen.getByTestId('live-now-count')).toHaveTextContent(/^0$/)
    })

    it('shows "—" while loading and "Could not load" on an error', () => {
      liveResult = { currentData: undefined, isLoading: true, isError: false }
      const { unmount } = render(<PartnerDetailsPage />)
      expect(screen.getByTestId('live-now-count')).toHaveTextContent(/^—$/)
      unmount()

      liveResult = { currentData: undefined, isLoading: false, isError: true }
      render(<PartnerDetailsPage />)
      expect(screen.getByTestId('live-now-count')).toHaveTextContent('Could not load')
    })

    it('ignores `data` from another restaurant: with no currentData it shows "—", not the old count (row 91 review)', () => {
      // What RTK Query gives while a new id is fetched: the previous answer in `data`, nothing in `currentData`.
      liveResult = {
        data: { data: [delivery({ id: 'old-live' })], pagination: { totalItems: 7 } },
        currentData: undefined,
        isLoading: false,
        isFetching: true,
        isError: false,
      }

      render(<PartnerDetailsPage />)

      expect(screen.getByTestId('live-now-count')).toHaveTextContent(/^—$/)
      expect(screen.queryByText('7')).toBeNull()
    })

    it('has no link of its own', () => {
      render(<PartnerDetailsPage />)

      const card = screen.getByText('Live now').closest('div') as HTMLElement
      expect(within(card).queryByRole('link')).toBeNull()
    })

    it('stops polling while the page is hidden', () => {
      mockUsePageVisible.mockReturnValue(false)

      render(<PartnerDetailsPage />)

      // The restaurant query itself stops polling when page is hidden
      expect(mockUseGetPartnerQuery).toHaveBeenCalledWith(
        { id: 'partner-abc-123' },
        { skip: false, pollingInterval: 0 },
      )
      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
        { partnerId: 'partner-abc-123', state: 'active', page: 1, perPage: 1 },
        { skip: false, pollingInterval: 0 },
      )
      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
        { partnerId: 'partner-abc-123', page: 1, perPage: 10 },
        { skip: false, pollingInterval: 0 },
      )
    })

    it('skips both delivery queries until the restaurant has loaded', () => {
      givenPartner(undefined, { isLoading: true })

      render(<PartnerDetailsPage />)

      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledTimes(2)
      for (const [, options] of mockUseGetDeliveriesQuery.mock.calls) {
        expect(options).toEqual(expect.objectContaining({ skip: true }))
      }
    })

    it('skips both delivery queries when the restaurant could not be loaded', () => {
      givenPartner(undefined, { isError: true })

      render(<PartnerDetailsPage />)

      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledTimes(2)
      for (const [, options] of mockUseGetDeliveriesQuery.mock.calls) {
        expect(options).toEqual(expect.objectContaining({ skip: true }))
      }
    })
  })

  describe('AC-4: details card', () => {
    it('shows the map at the pickup point and the DetailList rows', () => {
      render(<PartnerDetailsPage />)

      const map = screen.getByTestId('pickup-pin-map')
      expect(map).toHaveAttribute('data-lat', '39.3628')
      expect(map).toHaveAttribute('data-lng', '22.9435')

      const list = map.parentElement?.querySelector('dl') as HTMLElement
      expect(list).not.toBeNull()
      const terms = within(list).getAllByRole('term').map((el) => el.textContent)
      expect(terms).toEqual(['Pickup address', 'Pin', 'Phone', 'Sign-in email', 'Status updates'])
      const values = within(list).getAllByRole('definition')
      expect(values.map((el) => el.textContent)).toEqual([
        'Ermou 120, Volos, Thessaly, 38221 GR',
        '39.3628, 22.9435',
        '+302421012345',
        'souvlaki@bar.gr',
        'https://souvlaki.example/hook',
      ])
      // Pin, email and webhook URL are in mono.
      const [, pin, , email, webhook] = values as HTMLElement[]
      expect(pin).toHaveClass('font-mono')
      expect(email).toHaveClass('font-mono')
      expect(webhook).toHaveClass('font-mono')
      expect(screen.queryByText(/No pickup address/)).toBeNull()
      // No Add Webhook button.
      expect(screen.queryByRole('button', { name: /webhook/i })).toBeNull()
    })

    it('says "No webhook set" when there is no webhook URL', () => {
      givenPartner({ ...basePartner, webhookUrl: null } as unknown as PartnerAdminDto)

      render(<PartnerDetailsPage />)

      const value = screen.getByText('No webhook set')
      expect(value.tagName).toBe('DD')
      expect(value).not.toHaveClass('font-mono')
    })

    it('with no pickup address shows the warning and no map, and "—" for the address and pin', () => {
      givenPartner({ ...basePartner, pickupAddress: null } as unknown as PartnerAdminDto)

      render(<PartnerDetailsPage />)

      expect(screen.queryByTestId('pickup-pin-map')).toBeNull()
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('No pickup address. This restaurant cannot send a delivery until one is set.')

      const list = document.querySelector('dl') as HTMLElement
      const values = within(list).getAllByRole('definition')
      const [address, pin] = values as [HTMLElement, HTMLElement]
      expect(address).toHaveTextContent(/^—$/)
      expect(pin).toHaveTextContent(/^—$/)
    })
  })

  describe('AC-5: Recent deliveries', () => {
    it('asks for the 10 newest with { partnerId, page: 1, perPage: 10 }', () => {
      render(<PartnerDetailsPage />)

      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
        { partnerId: 'partner-abc-123', page: 1, perPage: 10 },
        { skip: false, pollingInterval: 30000 },
      )
    })

    it('shows each row with the reference and short id, the customer only, the date, its status, and a link', () => {
      const withRef = delivery({
        id: 'del-recent-123456',
        orderReference: 'ORD-77',
        status: EnumDeliveryStatus.ACCEPTED,
        dropoffName: 'Giannis S.',
        createdAt: new Date('2026-10-31T18:05:00.000Z'),
      })
      const noCustomer = delivery({
        id: 'del-recent-654321',
        orderReference: null as any,
        dropoffName: '',
        createdAt: new Date('2026-10-30T09:15:00.000Z'),
      })
      recentResult = { currentData: { data: [withRef, noCustomer] }, isLoading: false, isError: false }

      render(<PartnerDetailsPage />)

      const card = screen.getByText('Recent deliveries').closest('.min-w-0') as HTMLElement
      const items = within(card).getAllByRole('listitem')
      expect(items).toHaveLength(2)
      const [first, second] = items as [HTMLElement, HTMLElement]

      const link = within(first).getByRole('link', { name: 'ORD-77 · 123456' })
      expect(link).toHaveAttribute('href', '/deliveries/del-recent-123456')
      expect(within(first).getByText('Giannis S.')).toBeInTheDocument()
      // The restaurant's own name is not repeated in the row.
      expect(within(first).queryByText(/Souvlaki Bar/)).toBeNull()
      expect(within(first).queryByText(/→/)).toBeNull()
      expect(within(first).getByText(formatDate(withRef.createdAt))).toBeInTheDocument()
      expect(within(first).getByText(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)).toBeInTheDocument()
      expect(within(first).getByText('Accepted')).toBeInTheDocument()

      // No reference: the short id alone; no customer name: "—".
      expect(within(second).getByRole('link', { name: '654321' })).toBeInTheDocument()
      expect(within(second).getByText('—')).toBeInTheDocument()

      fireEvent.click(link)
      expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-recent-123456')
    })

    it('ignores `data` from another restaurant: with no currentData its rows are not shown (row 91 review)', () => {
      recentResult = {
        data: { data: [delivery({ id: 'del-oldrest-999999', orderReference: 'OLD-1', dropoffName: 'Previous Customer' })] },
        currentData: undefined,
        isLoading: false,
        isFetching: true,
        isError: false,
      }

      render(<PartnerDetailsPage />)

      expect(screen.queryByRole('link', { name: /OLD-1/ })).toBeNull()
      expect(screen.queryByText('Previous Customer')).toBeNull()
      const card = screen.getByText('Recent deliveries').closest('.min-w-0') as HTMLElement
      expect(within(card).queryAllByRole('listitem')).toHaveLength(0)
    })

    it('shows "Loading…", not the old rows, on a first load that still has `data` from another restaurant', () => {
      recentResult = {
        data: { data: [delivery({ id: 'del-oldrest-999999', orderReference: 'OLD-1' })] },
        currentData: undefined,
        isLoading: true,
        isError: false,
      }

      render(<PartnerDetailsPage />)

      const card = screen.getByText('Recent deliveries').closest('.min-w-0') as HTMLElement
      expect(within(card).getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /OLD-1/ })).toBeNull()
    })

    it('says "No deliveries yet" when there are none', () => {
      render(<PartnerDetailsPage />)

      expect(screen.getByText('No deliveries yet')).toBeInTheDocument()
    })

    it('says "Loading…" while loading and "Could not load deliveries." on an error', () => {
      recentResult = { currentData: undefined, isLoading: true, isError: false }
      const { unmount } = render(<PartnerDetailsPage />)
      const card = screen.getByText('Recent deliveries').closest('.min-w-0') as HTMLElement
      expect(within(card).getByText('Loading…')).toBeInTheDocument()
      unmount()

      recentResult = { currentData: undefined, isLoading: false, isError: true }
      render(<PartnerDetailsPage />)
      expect(screen.getByText('Could not load deliveries.')).toBeInTheDocument()
      expect(screen.queryByText('No deliveries yet')).toBeNull()
    })
  })

  describe('AC-6: saved customers card', () => {
    it('still shows the saved customers card for this restaurant', () => {
      render(<PartnerDetailsPage />)

      const card = screen.getByTestId('mock-customers-card')
      expect(card).toHaveAttribute('data-partner-id', 'partner-abc-123')
      expect(card).toHaveAttribute('data-name', 'Souvlaki Bar')
    })
  })

  describe('spec 0029, AC-9: availability card', () => {
    it('shows the availability card with current state and action on the restaurant page', () => {
      render(<PartnerDetailsPage />)

      expect(screen.getByRole('heading', { level: 3, name: 'Availability' })).toBeInTheDocument()
      expect(screen.getByTestId('availability-state')).toHaveTextContent('Accepting orders.')
      expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument()
    })
  })
})
