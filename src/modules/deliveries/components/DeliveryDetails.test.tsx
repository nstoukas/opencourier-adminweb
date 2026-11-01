import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { DeliveryDetails } from './DeliveryDetails'
import { Toaster } from '../../../admin-web-components'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryStatus, EnumDeliveryEventType } from '../../../shared-types'
import {
  useGetDeliveryQuery,
  useSubmitDeliveryEventMutation,
  useReassignDeliveryMutation,
  useAssignDeliveryToCourierMutation,
  useGetDeliveryEventsQuery,
  useGetDeliveryIssuesQuery,
} from '../../../api/deliveriesApi'
import { useGetAllCouriersQuery } from '../../../api/couriersApi'
import { useGetInstanceConfigQuery } from '../../../api/configApi'

// Mock Radix DropdownMenu primitive so dropdown menu content renders cleanly in JSDOM environment
jest.mock('@radix-ui/react-dropdown-menu', () => {
  const DummyComponent = ({
    children,
    onClick,
    asChild: _asChild,
    sideOffset: _sideOffset,
    align: _align,
    ...props
  }: any) => (
    <div onClick={onClick} {...props}>
      {children}
    </div>
  )
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: ({ children, asChild: _asChild, ...props }: any) => (
      <div role="button" {...props}>
        {children}
      </div>
    ),
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: DummyComponent,
    Item: DummyComponent,
    Group: DummyComponent,
    Label: DummyComponent,
    Separator: DummyComponent,
    Sub: DummyComponent,
    SubTrigger: DummyComponent,
    SubContent: DummyComponent,
    CheckboxItem: DummyComponent,
    RadioItem: DummyComponent,
    RadioGroup: DummyComponent,
  }
})

// Mock Radix Select primitive so component rendering in JSDOM does not crash on menu triggers
jest.mock('@radix-ui/react-select', () => {
  const mockReact = require('react') as typeof import('react')
  const SelectContext = mockReact.createContext<{ onValueChange?: (v: string) => void }>({})
  return {
    Root: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => (
      <button type="button" role="combobox" {...props}>
        {children}
      </button>
    ),
    Value: ({ placeholder, children }: any) => <span>{children || placeholder}</span>,
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = mockReact.useContext(SelectContext)
      return (
        <div role="option" onClick={() => onValueChange && onValueChange(value)} {...props}>
          {children}
        </div>
      )
    },
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <span>{children}</span>,
    Group: ({ children }: any) => <div>{children}</div>,
    Label: ({ children }: any) => <div>{children}</div>,
    Separator: () => <hr />,
  }
})

jest.mock('../../../api/deliveriesApi', () => ({
  useGetDeliveryQuery: jest.fn(),
  useSubmitDeliveryEventMutation: jest.fn(),
  useReassignDeliveryMutation: jest.fn(),
  useAssignDeliveryToCourierMutation: jest.fn(),
  useGetDeliveryEventsQuery: jest.fn(),
  useGetDeliveryIssuesQuery: jest.fn(),
}))

jest.mock('../../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(),
}))

jest.mock('../../../api/configApi', () => ({
  useGetInstanceConfigQuery: jest.fn(),
}))

const mockGoToDeliveries = jest.fn()
jest.mock('../../../hooks/useAdminPageNavigator', () => {
  const actual = jest.requireActual('../../../hooks/useAdminPageNavigator')
  return {
    ...actual,
    useAdminPageNavigator: () => ({
      goToDeliveries: mockGoToDeliveries,
      goToDeliveryDetails: jest.fn(),
    }),
  }
})

jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    pathname: '/deliveries/[deliveryId]',
    push: jest.fn(),
  }),
}))

const mockUseGetDeliveryQuery = useGetDeliveryQuery as jest.Mock
const mockUseSubmitDeliveryEventMutation = useSubmitDeliveryEventMutation as jest.Mock
const mockUseReassignDeliveryMutation = useReassignDeliveryMutation as jest.Mock
const mockUseAssignDeliveryToCourierMutation = useAssignDeliveryToCourierMutation as jest.Mock
const mockUseGetDeliveryEventsQuery = useGetDeliveryEventsQuery as jest.Mock
const mockUseGetDeliveryIssuesQuery = useGetDeliveryIssuesQuery as jest.Mock
const mockUseGetAllCouriersQuery = useGetAllCouriersQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock

const mockSubmitDeliveryEvent = jest.fn()

const sampleEurDelivery: DeliveryAdminDto = {
  id: 'd100',
  status: EnumDeliveryStatus.DISPATCHED,
  courierId: 'c1',
  currencyCode: 'EUR',
  orderTotalValue: 11204, // €112.04
  totalCost: 500, // €5.00
  fee: 300, // €3.00
  pay: 250, // €2.50
  tips: 100, // €1.00
  totalCompensation: 350, // €3.50
  customerName: 'Kostas Papadopoulos',
  customerPhoneNumber: '+306900000000',
  orderReference: 'ORD-EUR-1',
  pickupName: 'Volos Kitchen',
  pickupPhoneNumber: '+302421000000',
  pickupBusinessName: 'Volos Kitchen Ltd',
  pickupLocationId: 'loc-p1',
  pickupReadyAt: new Date('2026-07-30T10:00:00Z'),
  pickupDeadlineAt: new Date('2026-07-30T10:30:00Z'),
  pickupNotes: 'Use back entrance for pickup',
  pickupVerification: { type: 'PIN', code: '1234' },
  dropoffName: 'Giannis S.',
  dropoffPhoneNumber: '+306911111111',
  dropoffBusinessName: 'Acme Corp Office',
  dropoffLocationId: 'loc-d1',
  dropoffEta: new Date('2026-07-30T10:20:00Z'),
  dropoffReadyAt: new Date('2026-07-30T10:15:00Z'),
  dropoffDeadlineAt: new Date('2026-07-30T10:45:00Z'),
  dropoffNotes: 'Ring bell #4',
  dropoffSellerNotes: 'Handle with care: hot soup',
  dropoffVerification: 'SIGNATURE',
  deliverableAction: 'LEAVE_AT_DOOR',
  undeliverableAction: 'RETURN_TO_STORE',
  undeliverableReason: 'CUSTOMER_UNAVAILABLE',
  deliveryQuoteId: 'q-100',
  partnerId: 'partner-1',
  matchedCourierId: 'courier-matched-77',
  externalId: 'ext-order-101',
  externalStoreId: 'ext-store-55',
  idempotencyKey: 'idemp-key-abc-123',
  deliveryTypes: ['STANDARD'],
  pickupTypes: ['STORE'],
  customerNotes: ['Please do not ring bell if baby is sleeping'],
  requiresDropoffSignature: false,
  requiresId: false,
  orderItems: [{ name: 'Greek Salad', quantity: 2, size: 'Large' }],
  createdAt: new Date('2026-07-30T09:00:00Z'),
  updatedAt: new Date('2026-07-30T09:00:00Z'),
} as unknown as DeliveryAdminDto

describe('DeliveryDetails component (spec 0011, AC-2 & AC-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetDeliveryQuery.mockReturnValue({
      data: sampleEurDelivery,
      isLoading: false,
    })
    mockUseSubmitDeliveryEventMutation.mockReturnValue([
      mockSubmitDeliveryEvent,
      { isLoading: false },
    ])
    mockUseReassignDeliveryMutation.mockReturnValue([jest.fn(), { isLoading: false }])
    mockUseAssignDeliveryToCourierMutation.mockReturnValue([jest.fn(), { isLoading: false }])
    mockUseGetDeliveryEventsQuery.mockReturnValue({
      data: [
        {
          id: 'e1',
          type: 'CREATED',
          actor: 'PARTNER',
          eventSource: 'PARTNER_APP',
          oldStatus: null,
          newStatus: 'CREATED',
          transitionSuccessful: true,
          message: 'Delivery created',
          createdAt: new Date('2026-07-30T10:00:00Z'),
        },
      ],
      isLoading: false,
    })
    mockUseGetDeliveryIssuesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    })
    mockUseGetAllCouriersQuery.mockReturnValue({ data: [], isLoading: false })
    mockUseGetInstanceConfigQuery.mockReturnValue({ data: {}, isLoading: false })
  })

  it('renders loading state when API query is loading', () => {
    mockUseGetDeliveryQuery.mockReturnValue({ data: undefined, isLoading: true })
    render(<DeliveryDetails deliveryId="d100" />)
    expect(screen.getByText('Loading delivery data.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Delivery' })).toBeInTheDocument()
  })

  it('renders error message state when delivery data is unavailable', () => {
    mockUseGetDeliveryQuery.mockReturnValue({ data: undefined, isLoading: false })
    render(<DeliveryDetails deliveryId="d100" />)
    expect(screen.getByText('There was a problem loading data.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Delivery' })).toBeInTheDocument()
  })

  describe('Breadcrumb and Header (AC-2)', () => {
    it('renders breadcrumb with Deliveries link and current page marked aria-current="page", and exactly one h1', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      // Breadcrumb contains Deliveries link
      const deliveriesLink = screen.getByRole('link', { name: 'Deliveries' })
      expect(deliveriesLink).toBeInTheDocument()
      fireEvent.click(deliveriesLink)
      expect(mockGoToDeliveries).toHaveBeenCalledTimes(1)

      // Current page step is marked with aria-current="page" and is not a link
      const currentStep = screen.getByText('Delivery ORD-EUR-1', { selector: 'span[aria-current="page"]' })
      expect(currentStep).toBeInTheDocument()

      // Exactly one h1 on the page with title "Delivery ORD-EUR-1"
      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('Delivery ORD-EUR-1')

      // Status badge and created date under header
      expect(screen.getByText('Dispatched')).toBeInTheDocument()
      expect(screen.getByText(/Created 30\/07\/2026/)).toBeInTheDocument()
    })

    it('falls back to short id in title and breadcrumb when orderReference is missing', () => {
      const deliveryWithoutRef = {
        ...sampleEurDelivery,
        id: 'clabc123456',
        orderReference: null,
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: deliveryWithoutRef, isLoading: false })

      render(<DeliveryDetails deliveryId="clabc123456" />)

      // Short id is the last 6 characters in uppercase: "123456"
      const expectedTitle = 'Delivery 123456'
      expect(screen.getByRole('heading', { level: 1, name: expectedTitle })).toBeInTheDocument()
      expect(screen.getByText(expectedTitle, { selector: 'span[aria-current="page"]' })).toBeInTheDocument()
    })
  })

  it('renders Rider reports card above the What happened timeline card (decision 66.11, AC-3)', () => {
    render(<DeliveryDetails deliveryId="d100" />)

    const riderReportsTitle = screen.getByText('Rider reports')
    const whatHappenedTitle = screen.getByText('What happened')

    expect(riderReportsTitle).toBeInTheDocument()
    expect(whatHappenedTitle).toBeInTheDocument()

    // Rider reports card must appear above (before) the What happened timeline card
    const position = riderReportsTitle.compareDocumentPosition(whatHappenedTitle)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  describe('Money formatting per Delivery currencyCode (Test Plan B & AC-3)', () => {
    it('Case 1: EUR delivery renders exact euro amounts for all money rows', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('€112.04')).toBeInTheDocument() // Order total
      expect(screen.getByText('€5.00')).toBeInTheDocument() // Customer pays (totalCost)
      expect(screen.getByText('€3.00')).toBeInTheDocument() // Co-op fee
      expect(screen.getByText('€2.50')).toBeInTheDocument() // Rider pay recorded
      expect(screen.getByText('€1.00')).toBeInTheDocument() // Tips
      expect(screen.getByText('€3.50')).toBeInTheDocument() // Rider gets (totalCompensation)
    })

    it('Case 2: regression anti-test - EUR delivery contains no $ symbol anywhere in rendered container', () => {
      const { container } = render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.queryByText('$112.04')).toBeNull()
      expect(container.textContent).not.toContain('$')
    })

    it('Case 3: USD delivery renders $ amounts proving currency comes from the Delivery record', () => {
      const usdDelivery = { ...sampleEurDelivery, currencyCode: 'USD' }
      mockUseGetDeliveryQuery.mockReturnValue({ data: usdDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('$112.04')).toBeInTheDocument()
      expect(screen.getByText('$5.00')).toBeInTheDocument()
    })

    it('Case 4: missing currencyCode prints a bare number with no currency symbol ($ or €)', () => {
      const missingCurrencyDelivery = { ...sampleEurDelivery, currencyCode: '' }
      mockUseGetDeliveryQuery.mockReturnValue({
        data: missingCurrencyDelivery,
        isLoading: false,
      })

      const { container } = render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('112.04')).toBeInTheDocument()
      expect(screen.queryByText('$112.04')).toBeNull()
      expect(screen.queryByText('€112.04')).toBeNull()
      expect(container.textContent).not.toContain('$')
      expect(container.textContent).not.toContain('€')
    })

    it('Case 5: null money fields display em dash (—) scoped to their respective DetailList rows', () => {
      const nullMoneyDelivery = {
        ...sampleEurDelivery,
        fee: null,
        tips: null,
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: nullMoneyDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      // Find Fee dt and verify its dd is '—'
      const feeDt = screen.getByText(/Co-op fee/)
      expect(feeDt.nextElementSibling?.textContent).toBe('—')

      // Find Tips dt and verify its dd is '—'
      const tipsDt = screen.getByText('Tips')
      expect(tipsDt.nextElementSibling?.textContent).toBe('—')
    })

    it('Case 6: Currency row still displays the raw currencyCode string', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const currencyDt = screen.getByText('Currency')
      expect(currencyDt.nextElementSibling?.textContent).toBe('EUR')
    })
  })

  describe('Price breakdown card (AC-3, AC-7)', () => {
    it('renders Price breakdown card with Base fee, Distance fee, Rider gets, "Co-op fee (10%)" and Customer pays', () => {
      const ac7Delivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        baseFee: 200,
        distanceFee: 107,
        totalCompensation: 307,
        fee: 31,
        feePercentage: 10,
        totalCost: 338,
        pay: 200,
        currencyCode: 'EUR',
      } as unknown as DeliveryAdminDto

      mockUseGetDeliveryQuery.mockReturnValue({ data: ac7Delivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Price, from the quote')).toBeInTheDocument()

      const baseFeeDt = screen.getByText('Base fee')
      expect(baseFeeDt.nextElementSibling?.textContent).toBe('€2.00')

      const distanceFeeDt = screen.getByText('Distance fee')
      expect(distanceFeeDt.nextElementSibling?.textContent).toBe('€1.07')

      const riderGetsDt = screen.getByText('Rider gets')
      expect(riderGetsDt.nextElementSibling?.textContent).toBe('€3.07')

      const coopFeeDt = screen.getByText('Co-op fee (10%)')
      expect(coopFeeDt.nextElementSibling?.textContent).toBe('€0.31')

      const customerPaysDt = screen.getByText('Customer pays')
      expect(customerPaysDt.nextElementSibling?.textContent).toBe('€3.38')

      // Since pay fields are present, the "not offered yet" note is absent
      expect(
        screen.queryByText(
          /Rider pay, co-op fee and what the customer pays are set when the delivery is first offered to a rider\./
        )
      ).toBeNull()
    })

    it('shows the not offered yet note and dashes when pay fields are null', () => {
      const unofferedDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        baseFee: null,
        distanceFee: null,
        totalCompensation: null,
        fee: null,
        feePercentage: null,
        totalCost: null,
        pay: null,
        currencyCode: 'EUR',
      } as unknown as DeliveryAdminDto

      mockUseGetDeliveryQuery.mockReturnValue({ data: unofferedDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(
        screen.getByText(
          'Rider pay, co-op fee and what the customer pays are set when the delivery is first offered to a rider.'
        )
      ).toBeInTheDocument()

      expect(screen.getByText('Base fee').nextElementSibling?.textContent).toBe('—')
      expect(screen.getByText('Distance fee').nextElementSibling?.textContent).toBe('—')
      expect(screen.getByText('Rider gets').nextElementSibling?.textContent).toBe('—')
      expect(screen.getByText('Co-op fee').nextElementSibling?.textContent).toBe('—')
      expect(screen.getByText('Customer pays').nextElementSibling?.textContent).toBe('—')
      expect(screen.getByText('Rider pay recorded').nextElementSibling?.textContent).toBe('—')
    })
  })

  describe('Schedule date formatting & epoch trap guard', () => {
    it('renders em dash (—) and not "January 1, 1970" for epoch dates across schedule rows', () => {
      const epochDelivery = {
        ...sampleEurDelivery,
        pickupReadyAt: new Date(0),
        pickupDeadlineAt: new Date(0),
        dropoffReadyAt: new Date(0),
        dropoffEta: new Date(0),
        dropoffDeadlineAt: new Date(0),
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: epochDelivery, isLoading: false })

      const { container } = render(<DeliveryDetails deliveryId="d100" />)

      // None of the formatted dates render January 1, 1970
      expect(container.textContent).not.toContain('January 1, 1970')
      expect(container.textContent).not.toContain('01/01/1970')
    })
  })

  describe('Change status action menu & error handling (AC-2)', () => {
    it('submits delivery event when confirmed by user on Change status menu trigger', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({ unwrap: () => Promise.resolve({}) })

      render(<DeliveryDetails deliveryId="d100" />)

      // Open Change status menu
      const triggerBtn = screen.getByText('Change status')
      fireEvent.click(triggerBtn)

      // Click event item
      const menuItem = screen.getByText(/Arrived_at_pickup_location/i)
      fireEvent.click(menuItem)

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'd100',
          eventType: EnumDeliveryEventType.ARRIVED_AT_PICKUP_LOCATION,
          courierId: undefined,
        })
      })

      confirmSpy.mockRestore()
    })

    it('sends courierId with ACCEPTED event on Change status menu trigger', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({ unwrap: () => Promise.resolve({}) })

      const deliveryInAssigning = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        matchedCourierId: 'courier-matched-77',
        courierId: 'c1',
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: deliveryInAssigning, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      fireEvent.click(screen.getByText('Change status'))
      fireEvent.click(screen.getByText(/^Accepted$/i))

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'd100',
          eventType: EnumDeliveryEventType.ACCEPTED,
          courierId: 'courier-matched-77',
        })
      })

      confirmSpy.mockRestore()
    })

    it('omits ACCEPTED from Change status menu trigger when delivery has no rider ids', () => {
      const deliveryWithoutRiders = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        matchedCourierId: undefined,
        courierId: undefined,
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: deliveryWithoutRiders, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      fireEvent.click(screen.getByText('Change status'))

      expect(screen.queryByText(/^Accepted$/i)).toBeNull()
    })

    it('shows destructive toast when submitting delivery event fails', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.reject(new Error('Invalid transition')),
      })

      render(
        <>
          <Toaster />
          <DeliveryDetails deliveryId="d100" />
        </>
      )

      fireEvent.click(screen.getByText('Change status'))
      fireEvent.click(screen.getByText(/Arrived_at_pickup_location/i))

      expect(await screen.findByText('Delivery status transition failed')).toBeInTheDocument()
      expect(screen.getByText('Failed to change delivery status')).toBeInTheDocument()

      confirmSpy.mockRestore()
    })
  })

  describe('DeliveryEventTimeline integration & regression guards (Test Plan C)', () => {
    it('renders the DeliveryEventTimeline component with What happened heading', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('What happened')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
    })

    it('does not contain obsolete receipt card strings (regression guard)', () => {
      const { container } = render(<DeliveryDetails deliveryId="d100" />)

      expect(container.textContent).not.toContain(
        "This panel is this browser's copy of what was submitted and is lost on reload"
      )
      expect(container.textContent).not.toMatch(/adminweb has no endpoint/i)
    })
  })

  describe('Offer details, OfferCard, and Assign courier control (spec 0002, AC-11, AC-2)', () => {
    const fixedNow = new Date('2026-10-26T12:00:00.000Z')

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(fixedNow)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('renders open offer in status line (with full name) and OfferCard with expiry time', () => {
      const offeredDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Testing Courier',
        offeredAt: new Date(fixedNow.getTime() - 20_000), // 20s ago
        offerExpiresAt: new Date(fixedNow.getTime() + 40_000), // 40s in future
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: offeredDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      // Status line displays full name and waiting duration
      expect(screen.getByText(/Testing Courier, under 1 min/)).toBeInTheDocument()

      // OfferCard is rendered via DetailList
      expect(screen.getByText('Offered to')).toBeInTheDocument()
      expect(screen.getAllByText('Testing Courier').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Offered at')).toBeInTheDocument()
      expect(screen.getByText('Offer ends')).toBeInTheDocument()
    })

    it('renders "Not on its own" in OfferCard when offerExpiresAt is null (expiry off or admin offer)', () => {
      const untimedOfferDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Testing Courier',
        offeredAt: new Date(fixedNow.getTime() - 20_000),
        offerExpiresAt: null,
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: untimedOfferDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(
        screen.getByText('Not on its own: offer expiry is off, or an admin made this offer')
      ).toBeInTheDocument()
    })

    it('renders waiting state when no courier available: status line and OfferCard', () => {
      const waitingDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        offerExpiresAt: null,
        waitingForCourierSince: new Date(fixedNow.getTime() - 240_000), // 4 min ago
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: waitingDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText(/No rider free, 4 min/)).toBeInTheDocument()
      expect(screen.getByText('No rider free since')).toBeInTheDocument()
      expect(screen.getByText('Waiting')).toBeInTheDocument()
      expect(screen.getByText('4 min')).toBeInTheDocument()
    })

    it('renders "Looking for a rider" and no OfferCard when ASSIGNING_COURIER has no offer or wait time yet', () => {
      const lookingDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        offerExpiresAt: null,
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: lookingDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText(/Looking for a rider/i)).toBeInTheDocument()
      expect(screen.queryByText('Offered to')).toBeNull()
      expect(screen.queryByText('No rider free since')).toBeNull()
    })

    it('renders no OfferCard when delivery is DISPATCHED or ACCEPTED', () => {
      mockUseGetDeliveryQuery.mockReturnValue({ data: sampleEurDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.queryByText('Offered to')).toBeNull()
      expect(screen.queryByText('No rider free since')).toBeNull()
    })

    it('passes courierNameById to DeliveryEventTimeline to resolve rider names for OFFERED/OFFER_EXPIRED', () => {
      const offeredDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c-rider-1',
        matchedCourierName: 'Eleni Dimitriou',
        offeredAt: fixedNow,
        offerExpiresAt: null,
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: offeredDelivery, isLoading: false })
      mockUseGetAllCouriersQuery.mockReturnValue({
        data: [{ id: 'c-rider-1', firstName: 'Eleni', lastName: 'Dimitriou' }],
        isLoading: false,
      })
      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [
          {
            id: 'ev-offered',
            type: 'OFFERED',
            actor: 'SYSTEM',
            eventSource: 'OPENCOURIER',
            oldStatus: 'ASSIGNING_COURIER',
            newStatus: 'ASSIGNING_COURIER',
            transitionSuccessful: true,
            message: 'Delivery offered to courier',
            createdAt: fixedNow,
            courierId: 'c-rider-1',
          },
        ],
        isLoading: false,
      })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Rider')).toBeInTheDocument()
      expect(screen.getAllByText('Eleni Dimitriou').length).toBeGreaterThanOrEqual(1)
    })

    it('refreshes delivery query every 30 seconds via pollingInterval (spec 0002, AC-11)', () => {
      mockUseGetDeliveryQuery.mockReturnValue({ data: sampleEurDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(mockUseGetDeliveryQuery).toHaveBeenCalledWith(
        { id: 'd100' },
        expect.objectContaining({ pollingInterval: 30_000 })
      )
    })

    it('stops polling (pollingInterval: 0) when the tab is hidden / in background (F6, decision 61.52)', () => {
      const visibilitySpy = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      mockUseGetDeliveryQuery.mockReturnValue({ data: sampleEurDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(mockUseGetDeliveryQuery).toHaveBeenCalledWith(
        { id: 'd100' },
        expect.objectContaining({ pollingInterval: 0 })
      )

      visibilitySpy.mockRestore()
    })

    it('shows offer line and "Assign courier" control only when isLookingForRider (ASSIGNING_COURIER and no courierId - F2)', () => {
      // Case A: ASSIGNING_COURIER with courierId already set (rider accepted)
      const assigningWithAcceptedCourier: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: 'courier-accepted-99',
        matchedCourierId: 'courier-matched-77',
        matchedCourierName: 'Testing Courier',
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({
        data: assigningWithAcceptedCourier,
        isLoading: false,
      })

      const { rerender } = render(<DeliveryDetails deliveryId="d100" />)

      // Since courierId is set, isLookingForRider is false: no offer summary and no Assign courier button
      expect(screen.queryByText(/Offer:/i)).toBeNull()
      expect(screen.queryByText(/looking for a rider/i)).toBeNull()
      expect(screen.queryByRole('button', { name: /Assign courier/i })).toBeNull()

      // Case B: ASSIGNING_COURIER with no courierId (looking for rider)
      const assigningLookingForRider: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'courier-matched-77',
        matchedCourierName: 'Testing Courier',
        offeredAt: new Date(fixedNow.getTime() - 20_000),
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({
        data: assigningLookingForRider,
        isLoading: false,
      })

      rerender(<DeliveryDetails deliveryId="d100" />)

      // Both offer summary and assign control are rendered
      expect(screen.getByText(/Testing Courier, under 1 min/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Assign courier/i })).toBeInTheDocument()
    })

    it('Offer card label: 10 s past the deadline reads "Offer ends", 40 s past reads "Overdue since" (F7, decision 61.53)', () => {
      // fixedNow is 2026-10-26T12:00:00.000Z. Grace is 33 s.
      // Case 1: 10 s past the deadline (offerExpiresAt = 11:59:50.000Z).
      const tenSecPastDeadlineDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Testing Courier',
        offeredAt: new Date(fixedNow.getTime() - 70_000),
        offerExpiresAt: new Date(fixedNow.getTime() - 10_000), // 10 s past deadline
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: tenSecPastDeadlineDelivery, isLoading: false })
      const { rerender } = render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Offer ends')).toBeInTheDocument()
      expect(screen.queryByText('Overdue since')).toBeNull()

      // Case 2: 40 s past the deadline (offerExpiresAt = 11:59:20.000Z).
      const fortySecPastDeadlineDelivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Testing Courier',
        offeredAt: new Date(fixedNow.getTime() - 100_000),
        offerExpiresAt: new Date(fixedNow.getTime() - 40_000), // 40 s past deadline
        waitingForCourierSince: null,
      } as any

      mockUseGetDeliveryQuery.mockReturnValue({ data: fortySecPastDeadlineDelivery, isLoading: false })
      rerender(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Overdue since')).toBeInTheDocument()
      expect(screen.queryByText('Offer ends')).toBeNull()
    })
  })

  describe('Comprehensive field preservation in Pickup, Drop off, Order, and Technical details (AC-3)', () => {
    it('renders every field in Pickup facts card', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const pickupCard = screen.getByText('Pickup', { selector: 'h3' }).closest('.rounded-lg')
      expect(pickupCard).not.toBeNull()
      const scope = within(pickupCard as HTMLElement)

      expect(scope.getByText('Business').nextElementSibling?.textContent).toBe('Volos Kitchen Ltd')
      expect(scope.getByText('Name').nextElementSibling?.textContent).toBe('Volos Kitchen')
      expect(scope.getByText('Phone').nextElementSibling?.textContent).toBe('+302421000000')
      expect(scope.getByText('Ready').nextElementSibling?.textContent).toBe('30/07/2026, 13:00')
      expect(scope.getByText('Deadline').nextElementSibling?.textContent).toBe('30/07/2026, 13:30')
      expect(scope.getByText('Notes').nextElementSibling?.textContent).toBe('Use back entrance for pickup')
      expect(scope.getByText('Verification').nextElementSibling?.textContent).toBe('{"type":"PIN","code":"1234"}')
    })

    it('renders every field in Drop off facts card', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const dropoffCard = screen.getByText('Drop off', { selector: 'h3' }).closest('.rounded-lg')
      expect(dropoffCard).not.toBeNull()
      const scope = within(dropoffCard as HTMLElement)

      expect(scope.getByText('Name').nextElementSibling?.textContent).toBe('Giannis S.')
      expect(scope.getByText('Business').nextElementSibling?.textContent).toBe('Acme Corp Office')
      expect(scope.getByText('Phone').nextElementSibling?.textContent).toBe('+306911111111')
      expect(scope.getByText('ETA').nextElementSibling?.textContent).toBe('30/07/2026, 13:20')
      expect(scope.getByText('Ready').nextElementSibling?.textContent).toBe('30/07/2026, 13:15')
      expect(scope.getByText('Deadline').nextElementSibling?.textContent).toBe('30/07/2026, 13:45')
      expect(scope.getByText('Notes').nextElementSibling?.textContent).toBe('Ring bell #4')
      expect(scope.getByText('Seller notes').nextElementSibling?.textContent).toBe('Handle with care: hot soup')
      expect(scope.getByText('Verification').nextElementSibling?.textContent).toBe('SIGNATURE')
      expect(scope.getByText('When delivered').nextElementSibling?.textContent).toBe('LEAVE_AT_DOOR')
      expect(scope.getByText('When undeliverable').nextElementSibling?.textContent).toBe('RETURN_TO_STORE')
      expect(scope.getByText('Undeliverable reason').nextElementSibling?.textContent).toBe('CUSTOMER_UNAVAILABLE')
    })

    it('renders every field in Order facts card and order items list', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const orderCard = screen.getByText('Order', { selector: 'h3' }).closest('.rounded-lg')
      expect(orderCard).not.toBeNull()
      const scope = within(orderCard as HTMLElement)

      expect(scope.getByText('Order reference').nextElementSibling?.textContent).toBe('ORD-EUR-1')
      expect(scope.getByText('Customer').nextElementSibling?.textContent).toBe('Kostas Papadopoulos')
      expect(scope.getByText('Customer phone').nextElementSibling?.textContent).toBe('+306900000000')
      expect(scope.getByText('Order total').nextElementSibling?.textContent).toBe('€112.04')
      expect(scope.getByText('Tips').nextElementSibling?.textContent).toBe('€1.00')
      expect(scope.getByText('Customer notes').nextElementSibling?.textContent).toBe(
        'Please do not ring bell if baby is sleeping'
      )
      expect(scope.getByText('Delivery types').nextElementSibling?.textContent).toBe('STANDARD')
      expect(scope.getByText('Pickup types').nextElementSibling?.textContent).toBe('STORE')
      expect(scope.getByText('Drop off signature required').nextElementSibling?.textContent).toBe('No')
      expect(scope.getByText('ID check required').nextElementSibling?.textContent).toBe('No')

      // Order items section
      expect(scope.getByText('Order items')).toBeInTheDocument()
      expect(scope.getByText(/Greek Salad × 2 \(Large\)/)).toBeInTheDocument()
    })

    it('renders all IDs in Technical details accordion once opened', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const techAccordion = screen.getByText('Technical details')
      expect(techAccordion).toBeInTheDocument()

      // Click to open the accordion (closed by default)
      fireEvent.click(techAccordion)

      // The Accordion content is rendered once opened
      expect(screen.getByText('Delivery ID').nextElementSibling?.textContent).toBe('d100')
      expect(screen.getByText('Delivery quote ID').nextElementSibling?.textContent).toBe('q-100')
      expect(screen.getByText('Partner ID').nextElementSibling?.textContent).toBe('partner-1')
      expect(screen.getByText('Courier ID').nextElementSibling?.textContent).toBe('c1')
      expect(screen.getByText('Matched courier ID').nextElementSibling?.textContent).toBe('courier-matched-77')
      expect(screen.getByText('Pickup location ID').nextElementSibling?.textContent).toBe('loc-p1')
      expect(screen.getByText('Drop off location ID').nextElementSibling?.textContent).toBe('loc-d1')
      expect(screen.getByText('External ID').nextElementSibling?.textContent).toBe('ext-order-101')
      expect(screen.getByText('External store ID').nextElementSibling?.textContent).toBe('ext-store-55')
      expect(screen.getByText('Idempotency key').nextElementSibling?.textContent).toBe('idemp-key-abc-123')
    })
  })
})
