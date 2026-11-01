import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CourierDetails } from './CourierDetails'
import ViewCourierPage from '@/pages/couriers/[courierId]'
import { EnumCourierStatus, EnumDeliveryStatus } from '@/shared-types'
import type { CourierAdminDto, DeliveryAdminDto } from '@/backend-admin-sdk'

// Mock DefaultLayout to isolate the page
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock admin page navigator
const mockGoToCouriers = jest.fn()
const mockGoToDeliveryDetails = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToCouriers: mockGoToCouriers,
    goToDeliveryDetails: mockGoToDeliveryDetails,
  }),
}))

// Mock next/router
const mockRouter = {
  pathname: '/couriers/[courierId]',
  query: { courierId: 'courier-router-id' } as Record<string, string>,
  push: jest.fn(),
}
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock page visibility
const mockUsePageVisible = jest.fn()
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockUsePageVisible(),
}))

// Mock RTK Query hooks
const mockUseGetCourierQuery = jest.fn()
const mockUseRotateCourierPasswordMutation = jest.fn()
jest.mock('../../api/couriersApi', () => ({
  useGetCourierQuery: (args: any, options: any) => mockUseGetCourierQuery(args, options),
  useRotateCourierPasswordMutation: () => mockUseRotateCourierPasswordMutation(),
}))

const mockUseGetDeliveriesQuery = jest.fn()
jest.mock('../../api/deliveriesApi', () => ({
  useGetDeliveriesQuery: (args: any, options: any) => mockUseGetDeliveriesQuery(args, options),
}))

describe('Courier details page (CourierDetails) (spec 0012, AC-2 to AC-6)', () => {
  const baseCourier: CourierAdminDto = {
    id: 'c1',
    firstName: 'Nikos',
    lastName: 'Pappas',
    phoneNumber: '+306912345678',
    status: EnumCourierStatus.ONLINE,
    deliverySetting: 'AUTO_ACCEPT',
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
  } as any

  let activeDeliveriesResult: { data?: { data: DeliveryAdminDto[] }; isLoading: boolean; isError: boolean }
  let recentDeliveriesResult: { data?: { data: DeliveryAdminDto[] }; isLoading: boolean; isError: boolean }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUsePageVisible.mockReturnValue(true)
    mockUseRotateCourierPasswordMutation.mockReturnValue([jest.fn(), { isLoading: false }])

    activeDeliveriesResult = {
      data: { data: [] },
      isLoading: false,
      isError: false,
    }

    recentDeliveriesResult = {
      data: { data: [] },
      isLoading: false,
      isError: false,
    }

    mockUseGetCourierQuery.mockReturnValue({
      currentData: baseCourier,
      isLoading: false,
      isError: false,
    })

    mockUseGetDeliveriesQuery.mockImplementation((args: any, options: any) => {
      if (options?.skip) {
        return { data: undefined, isLoading: false, isError: false }
      }
      if (args?.state === 'active') {
        return activeDeliveriesResult
      }
      return recentDeliveriesResult
    })
  })

  describe('AC-2: Header, Breadcrumb, and Profile', () => {
    it('renders breadcrumb "Couriers › <name>", full name h1, status badge, phone, member since, Call link, and no Set Offline button', () => {
      render(<CourierDetails courierId="c1" />)

      // Breadcrumb with Couriers step that navigates via goToCouriers
      const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(breadcrumbNav).toBeInTheDocument()
      const couriersLink = within(breadcrumbNav).getByRole('link', { name: 'Couriers' })
      expect(couriersLink).toBeInTheDocument()
      fireEvent.click(couriersLink)
      expect(mockGoToCouriers).toHaveBeenCalledTimes(1)
      expect(within(breadcrumbNav).getByText('Nikos Pappas')).toBeInTheDocument()

      // The h1 is the full name
      expect(screen.getByRole('heading', { level: 1, name: 'Nikos Pappas' })).toBeInTheDocument()

      // Courier status badge, phone, and member since
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByText('+306912345678')).toBeInTheDocument()
      expect(screen.getByText('Member since July 2026')).toBeInTheDocument()

      // Call button is a tel: link with "Call <firstName>"
      const callLink = screen.getByRole('link', { name: /call nikos/i })
      expect(callLink).toBeInTheDocument()
      expect(callLink).toHaveAttribute('href', 'tel:+306912345678')

      // No Set Offline button (an admin changing rider status needs audit record)
      expect(screen.queryByRole('button', { name: /set offline|offline/i })).toBeNull()
    })

    it('renders "Call" alone when first name is empty', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: {
          ...baseCourier,
          firstName: '   ',
          lastName: 'Pappas',
        },
        isLoading: false,
        isError: false,
      })

      render(<CourierDetails courierId="c1" />)

      const callLink = screen.getByRole('link', { name: /^call$/i })
      expect(callLink).toBeInTheDocument()
      expect(callLink).toHaveAttribute('href', 'tel:+306912345678')
    })

    it('renders no call link when phone is null, showing "No phone" in header metadata', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: {
          ...baseCourier,
          phoneNumber: null,
        },
        isLoading: false,
        isError: false,
      })

      render(<CourierDetails courierId="c1" />)

      expect(screen.queryByRole('link', { name: /call/i })).toBeNull()
      expect(screen.getByText('No phone')).toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    it('renders h1 "Courier" and "Loading…" while courier is loading, and skips deliveries queries', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: undefined,
        isLoading: true,
        isError: false,
      })

      render(<CourierDetails courierId="c1" />)

      expect(screen.getByRole('heading', { level: 1, name: 'Courier' })).toBeInTheDocument()
      expect(screen.getByText('Loading…')).toBeInTheDocument()

      // Deliveries queries must be skipped while courier is not loaded
      const deliveriesCalls = mockUseGetDeliveriesQuery.mock.calls
      expect(deliveriesCalls.length).toBeGreaterThan(0)
      for (const call of deliveriesCalls) {
        expect(call?.[1]?.skip).toBe(true)
      }
    })

    it('renders h1 "Courier" and "Courier not found or could not be loaded." on error, skipping delivery queries', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })

      render(<CourierDetails courierId="c-not-found" />)

      expect(screen.getByRole('heading', { level: 1, name: 'Courier' })).toBeInTheDocument()
      expect(screen.getByText('Courier not found or could not be loaded.')).toBeInTheDocument()

      const deliveriesCalls = mockUseGetDeliveriesQuery.mock.calls
      for (const call of deliveriesCalls) {
        expect(call?.[1]?.skip).toBe(true)
      }
    })

    it('renders h1 "Courier" and "Courier not found or could not be loaded." when courierId is empty', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: false,
      })

      render(<CourierDetails courierId="" />)

      expect(screen.getByRole('heading', { level: 1, name: 'Courier' })).toBeInTheDocument()
      expect(screen.getByText('Courier not found or could not be loaded.')).toBeInTheDocument()

      // useGetCourierQuery was skipped because courierId is empty
      expect(mockUseGetCourierQuery).toHaveBeenCalledWith(
        { id: '' },
        { skip: true, pollingInterval: 30000 }
      )
    })

    it('shows h1 "Courier" and "Loading…", not previous courier name, when data has previous record but currentData is undefined', () => {
      mockUseGetCourierQuery.mockReturnValue({
        data: {
          ...baseCourier,
          firstName: 'Stale',
          lastName: 'Courier',
        },
        currentData: undefined,
        isLoading: false,
        isError: false,
      })

      render(<CourierDetails courierId="c2" />)

      // Shows generic header and loading message, not the previous courier
      expect(screen.getByRole('heading', { level: 1, name: 'Courier' })).toBeInTheDocument()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText(/stale/i)).toBeNull()
      expect(screen.queryByRole('heading', { name: /stale/i })).toBeNull()
    })
  })

  describe('AC-3: Right now card', () => {
    it('calls useGetDeliveriesQuery with { courierId, state: "active", page: 1, perPage: 10 } and renders active deliveries', () => {
      const activeDelivery: DeliveryAdminDto = {
        id: 'del-act-123456',
        orderReference: 'ORD-REF-42',
        status: EnumDeliveryStatus.ACCEPTED,
        pickupBusinessName: 'Souvlaki Bar',
        dropoffName: 'Giannis S.',
        createdAt: new Date('2026-10-31T18:00:00.000Z'),
      } as any

      activeDeliveriesResult = {
        data: { data: [activeDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      // Verified exact arguments passed to query
      expect(mockUseGetDeliveriesQuery).toHaveBeenCalledWith(
        { courierId: 'c1', state: 'active', page: 1, perPage: 10 },
        { skip: false, pollingInterval: 30000 }
      )

      // Right now card content
      const nowCard = screen.getByText('Right now').closest('div')
      expect(nowCard).not.toBeNull()

      // Order reference with short id (last 6 chars: "123456")
      const deliveryLink = screen.getByRole('link', { name: /ORD-REF-42 · 123456/i })
      expect(deliveryLink).toBeInTheDocument()
      expect(deliveryLink).toHaveAttribute('href', '/deliveries/del-act-123456')

      // Restaurant → Customer
      expect(screen.getByText('Souvlaki Bar → Giannis S.')).toBeInTheDocument()

      // Delivery StatusBadge
      expect(screen.getByText('Accepted')).toBeInTheDocument()

      // Clicking link navigates to delivery details
      fireEvent.click(deliveryLink)
      expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-act-123456')
    })

    it('intercepts only plain left click on delivery link, letting ctrl, meta, shift, and middle click pass to browser', () => {
      const activeDelivery: DeliveryAdminDto = {
        id: 'del-act-123456',
        orderReference: 'ORD-REF-42',
        status: EnumDeliveryStatus.ACCEPTED,
        pickupBusinessName: 'Souvlaki Bar',
        dropoffName: 'Giannis S.',
        createdAt: new Date('2026-10-31T18:00:00.000Z'),
      } as any

      activeDeliveriesResult = {
        data: { data: [activeDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      const deliveryLink = screen.getByRole('link', { name: /ORD-REF-42 · 123456/i })

      // 1. Ctrl + click: browser handles new tab, goToDeliveryDetails is NOT called
      fireEvent.click(deliveryLink, { button: 0, ctrlKey: true })
      expect(mockGoToDeliveryDetails).not.toHaveBeenCalled()

      // 2. Meta (Cmd) + click: browser handles new tab, goToDeliveryDetails is NOT called
      fireEvent.click(deliveryLink, { button: 0, metaKey: true })
      expect(mockGoToDeliveryDetails).not.toHaveBeenCalled()

      // 3. Shift + click: browser handles new window, goToDeliveryDetails is NOT called
      fireEvent.click(deliveryLink, { button: 0, shiftKey: true })
      expect(mockGoToDeliveryDetails).not.toHaveBeenCalled()

      // 4. Middle click (button 1): browser handles new tab, goToDeliveryDetails is NOT called
      fireEvent.click(deliveryLink, { button: 1 })
      expect(mockGoToDeliveryDetails).not.toHaveBeenCalled()

      // 5. Plain left click (button 0, no modifiers): calls goToDeliveryDetails
      fireEvent.click(deliveryLink, { button: 0 })
      expect(mockGoToDeliveryDetails).toHaveBeenCalledTimes(1)
      expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-act-123456')
    })

    it('renders status badge in a container with min-w-28 minimum width', () => {
      const activeDelivery: DeliveryAdminDto = {
        id: 'del-act-123456',
        status: EnumDeliveryStatus.ACCEPTED,
        pickupBusinessName: 'Souvlaki Bar',
        dropoffName: 'Giannis S.',
        createdAt: new Date('2026-10-31T18:00:00.000Z'),
      } as any

      activeDeliveriesResult = {
        data: { data: [activeDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      const deliveryLink = screen.getByRole('link', { name: /123456/i })
      const rowItem = deliveryLink.closest('li')
      expect(rowItem).not.toBeNull()
      const badgeSlot = rowItem?.querySelector('span.min-w-28')
      expect(badgeSlot).not.toBeNull()
      expect(badgeSlot?.className).toContain('min-w-28')
    })

    it('falls back to "—" when pickupBusinessName or dropoffName is missing in Right now', () => {
      const activeDelivery: DeliveryAdminDto = {
        id: 'del-act-999999',
        orderReference: null,
        status: EnumDeliveryStatus.DISPATCHED,
        pickupBusinessName: null,
        dropoffName: null,
        createdAt: new Date('2026-10-31T18:00:00.000Z'),
      } as any

      activeDeliveriesResult = {
        data: { data: [activeDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      expect(screen.getByText('— → —')).toBeInTheDocument()
      expect(screen.getByText('999999')).toBeInTheDocument()
    })

    it('renders "Not carrying a delivery" when empty', () => {
      activeDeliveriesResult = {
        data: { data: [] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)
      expect(screen.getByText('Not carrying a delivery')).toBeInTheDocument()
    })

    it('renders "Loading…" while active deliveries are loading', () => {
      activeDeliveriesResult = {
        data: undefined,
        isLoading: true,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)
      const nowCard = screen.getByText('Right now').closest('.rounded-lg') as HTMLElement
      expect(within(nowCard).getByText('Loading…')).toBeInTheDocument()
    })

    it('renders "Could not load deliveries." on active deliveries error', () => {
      activeDeliveriesResult = {
        data: undefined,
        isLoading: false,
        isError: true,
      }

      render(<CourierDetails courierId="c1" />)
      const nowCard = screen.getByText('Right now').closest('.rounded-lg') as HTMLElement
      expect(within(nowCard).getByText('Could not load deliveries.')).toBeInTheDocument()
    })
  })

  describe('AC-4: Recent deliveries card', () => {
    it('calls useGetDeliveriesQuery with { courierId, page: 1, perPage: 10 } and NO state, displaying date/time, pay, and link', () => {
      const recentDelivery: DeliveryAdminDto = {
        id: 'del-rec-789012',
        orderReference: 'ORD-REC-1',
        status: EnumDeliveryStatus.DROPPED_OFF,
        pickupBusinessName: 'Pizza Mia',
        dropoffName: 'Elena P.',
        totalCompensation: 650, // €6.50
        currencyCode: 'EUR',
        createdAt: new Date('2026-10-30T14:30:00.000Z'),
      } as any

      recentDeliveriesResult = {
        data: { data: [recentDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      // Verified exact arguments passed to query (NO state field)
      const calls = mockUseGetDeliveriesQuery.mock.calls
      const recentCall = calls.find((c) => c?.[0]?.courierId === 'c1' && c?.[0]?.state === undefined)
      expect(recentCall).toBeDefined()
      expect(recentCall?.[0]).toEqual({
        courierId: 'c1',
        page: 1,
        perPage: 10,
      })
      expect(recentCall?.[1]).toEqual({ skip: false, pollingInterval: 30000 })

      // Recent deliveries card content
      const recentCard = screen.getByText('Recent deliveries').closest('.rounded-lg') as HTMLElement
      expect(recentCard).not.toBeNull()

      // Order reference and short id
      const deliveryLink = within(recentCard).getByRole('link', { name: /ORD-REC-1 · 789012/i })
      expect(deliveryLink).toBeInTheDocument()
      expect(deliveryLink).toHaveAttribute('href', '/deliveries/del-rec-789012')

      // Pay formatted with currency (€6.50)
      expect(within(recentCard).getByText('€6.50')).toBeInTheDocument()

      // Delivery StatusBadge
      expect(within(recentCard).getByText('Dropped Off')).toBeInTheDocument()

      // Clicking link navigates to delivery details
      fireEvent.click(deliveryLink)
      expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-rec-789012')
    })

    it('renders "—" when totalCompensation is null in Recent deliveries', () => {
      const recentDelivery: DeliveryAdminDto = {
        id: 'del-rec-null-pay',
        orderReference: 'ORD-REC-2',
        status: EnumDeliveryStatus.CANCELED,
        pickupBusinessName: 'Cafe Central',
        dropoffName: 'Kostas M.',
        totalCompensation: null,
        currencyCode: 'EUR',
        createdAt: new Date('2026-10-30T12:00:00.000Z'),
      } as any

      recentDeliveriesResult = {
        data: { data: [recentDelivery] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      const recentCard = screen.getByText('Recent deliveries').closest('.rounded-lg') as HTMLElement
      expect(within(recentCard).getByText('—')).toBeInTheDocument()
    })

    it('renders "No deliveries yet" when empty', () => {
      recentDeliveriesResult = {
        data: { data: [] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)
      expect(screen.getByText('No deliveries yet')).toBeInTheDocument()
    })

    it('renders "Loading…" while recent deliveries are loading', () => {
      recentDeliveriesResult = {
        data: undefined,
        isLoading: true,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)
      const recentCard = screen.getByText('Recent deliveries').closest('.rounded-lg') as HTMLElement
      expect(within(recentCard).getByText('Loading…')).toBeInTheDocument()
    })

    it('renders "Could not load deliveries." on recent deliveries error', () => {
      recentDeliveriesResult = {
        data: undefined,
        isLoading: false,
        isError: true,
      }

      render(<CourierDetails courierId="c1" />)
      const recentCard = screen.getByText('Recent deliveries').closest('.rounded-lg') as HTMLElement
      expect(within(recentCard).getByText('Could not load deliveries.')).toBeInTheDocument()
    })
  })

  describe('AC-5: Setup card', () => {
    it('shows offer setting in words only, omitting upstream gig fields (vehicle, earning goals, speed, food preferences)', () => {
      render(<CourierDetails courierId="c1" />)

      const setupCard = screen.getByText('Setup').closest('.rounded-lg') as HTMLElement
      expect(setupCard).not.toBeNull()

      // Offers setting in words
      expect(within(setupCard).getByText('Offers')).toBeInTheDocument()
      expect(within(setupCard).getByText('Auto accept')).toBeInTheDocument()

      // None of the upstream settings
      expect(screen.queryByText(/vehicle/i)).toBeNull()
      expect(screen.queryByText(/earning|goal/i)).toBeNull()
      expect(screen.queryByText(/speed/i)).toBeNull()
      expect(screen.queryByText(/food|restaurant\s*preference/i)).toBeNull()
    })

    it('shows "Not set" in Setup when deliverySetting is NONE', () => {
      mockUseGetCourierQuery.mockReturnValue({
        currentData: {
          ...baseCourier,
          deliverySetting: 'NONE',
        },
        isLoading: false,
        isError: false,
      })

      render(<CourierDetails courierId="c1" />)

      const setupCard = screen.getByText('Setup').closest('.rounded-lg') as HTMLElement
      expect(within(setupCard).getByText('Not set')).toBeInTheDocument()
    })
  })

  describe('Polling intervals and tab visibility (spec 0012, row 89 review fixes)', () => {
    it('polls every 30 s on courier query and both delivery queries while tab is visible', () => {
      mockUsePageVisible.mockReturnValue(true)
    mockUseRotateCourierPasswordMutation.mockReturnValue([jest.fn(), { isLoading: false }])

      render(<CourierDetails courierId="c1" />)

      // Courier query polls at 30 s (30000 ms)
      expect(mockUseGetCourierQuery).toHaveBeenCalledWith(
        { id: 'c1' },
        { skip: false, pollingInterval: 30000 }
      )

      // Both delivery queries poll at 30 s (30000 ms)
      const calls = mockUseGetDeliveriesQuery.mock.calls
      const activeCall = calls.find((c) => c?.[0]?.courierId === 'c1' && c?.[0]?.state === 'active')
      const recentCall = calls.find((c) => c?.[0]?.courierId === 'c1' && c?.[0]?.state === undefined)

      expect(activeCall).toBeDefined()
      expect(activeCall?.[1]).toEqual({ skip: false, pollingInterval: 30000 })

      expect(recentCall).toBeDefined()
      expect(recentCall?.[1]).toEqual({ skip: false, pollingInterval: 30000 })
    })

    it('disables polling (pollingInterval: 0) on courier query and both delivery queries while tab is hidden', () => {
      mockUsePageVisible.mockReturnValue(false)

      render(<CourierDetails courierId="c1" />)

      // Courier query pollingInterval is 0 when tab is hidden
      expect(mockUseGetCourierQuery).toHaveBeenCalledWith(
        { id: 'c1' },
        { skip: false, pollingInterval: 0 }
      )

      // Both delivery queries have pollingInterval: 0 when tab is hidden
      const calls = mockUseGetDeliveriesQuery.mock.calls
      const activeCall = calls.find((c) => c?.[0]?.courierId === 'c1' && c?.[0]?.state === 'active')
      const recentCall = calls.find((c) => c?.[0]?.courierId === 'c1' && c?.[0]?.state === undefined)

      expect(activeCall).toBeDefined()
      expect(activeCall?.[1]).toEqual({ skip: false, pollingInterval: 0 })

      expect(recentCall).toBeDefined()
      expect(recentCall?.[1]).toEqual({ skip: false, pollingInterval: 0 })
    })

    it('skips deliveries queries while courier has not yet loaded, preserving pollingInterval', () => {
      mockUsePageVisible.mockReturnValue(true)
    mockUseRotateCourierPasswordMutation.mockReturnValue([jest.fn(), { isLoading: false }])
      mockUseGetCourierQuery.mockReturnValue({
        currentData: undefined,
        isLoading: true,
        isError: false,
      })

      render(<CourierDetails courierId="c1" />)

      const calls = mockUseGetDeliveriesQuery.mock.calls
      expect(calls.length).toBe(2)
      for (const call of calls) {
        expect(call?.[1]).toEqual({ skip: true, pollingInterval: 30000 })
      }
    })
  })

  describe('AC-6: Value 5 & co-op invariants', () => {
    it('renders no rider counts, totals of pay, location, or email', () => {
      const { container } = render(<CourierDetails courierId="c1" />)
      const content = container.textContent ?? ''

      // No counts like "Carrying N deliveries"
      expect(content).not.toMatch(/carrying\s*\d/i)
      // No sum or total of compensation
      expect(content).not.toMatch(/total\s*(pay|earned|compensation)/i)
      // No location coordinates or online tracking
      expect(content).not.toMatch(/location|latitude|longitude|coords/i)
      // No email address
      expect(content).not.toMatch(/@|email/i)
    })
  })

  describe('Change password button and RotateCourierPasswordDialog (spec 0013, AC-6)', () => {
    it('opens dialog with carryingDelivery true when Right now query has deliveries', () => {
      activeDeliveriesResult = {
        data: {
          data: [
            {
              id: 'del-active-1',
              status: EnumDeliveryStatus.PICKED_UP,
              createdAt: new Date(),
            } as any,
          ],
        },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      const changePwBtn = screen.getByRole('button', { name: /change password/i })
      expect(changePwBtn).toBeInTheDocument()
      fireEvent.click(changePwBtn)

      // Dialog opens and displays carrying delivery warning naming first name
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('note')).toHaveTextContent(
        'Nikos is carrying a delivery. Steps still waiting on their phone are sent only when they log in again on that phone. If the phone is lost, reassign the delivery.'
      )
    })

    it('opens dialog with carryingDelivery false when Right now query has no deliveries', () => {
      activeDeliveriesResult = {
        data: { data: [] },
        isLoading: false,
        isError: false,
      }

      render(<CourierDetails courierId="c1" />)

      const changePwBtn = screen.getByRole('button', { name: /change password/i })
      fireEvent.click(changePwBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Nikos is signed out of the app on their phone and set Offline/i)).toBeInTheDocument()
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })
  })

  describe('Route wrapper (src/pages/couriers/[courierId].tsx)', () => {
    it('extracts courierId from router.query and renders CourierDetails', () => {
      render(<ViewCourierPage />)

      // router.query.courierId is 'courier-router-id'
      expect(mockUseGetCourierQuery).toHaveBeenCalledWith(
        { id: 'courier-router-id' },
        { skip: false, pollingInterval: 30000 }
      )
    })
  })
})
