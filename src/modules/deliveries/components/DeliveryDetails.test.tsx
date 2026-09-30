import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
} from '../../../api/deliveriesApi'
import { useGetAllCouriersQuery } from '../../../api/couriersApi'
import { useGetInstanceConfigQuery } from '../../../api/configApi'
import { useAdminPageNavigator } from '../../../hooks/useAdminPageNavigator'

// Mock Radix DropdownMenu primitive so dropdown menu content renders cleanly in JSDOM environment
jest.mock('@radix-ui/react-dropdown-menu', () => {
  // Renamed with a leading underscore, not deleted: this pulls the prop out of ...props so it
  // is never spread onto the DOM.
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
  const React = require('react') as typeof import('react')
  const SelectContext = React.createContext<{ onValueChange?: (v: string) => void }>({})
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
      const { onValueChange } = React.useContext(SelectContext)
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

// The Radix UI JSDOM polyfills this suite needs now live in jest.setup.js.

jest.mock('../../../api/deliveriesApi', () => ({
  useGetDeliveryQuery: jest.fn(),
  useSubmitDeliveryEventMutation: jest.fn(),
  useReassignDeliveryMutation: jest.fn(),
  useAssignDeliveryToCourierMutation: jest.fn(),
  useGetDeliveryEventsQuery: jest.fn(),
}))

jest.mock('../../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(),
}))

jest.mock('../../../api/configApi', () => ({
  useGetInstanceConfigQuery: jest.fn(),
}))

jest.mock('../../../hooks/useAdminPageNavigator', () => {
  const actual = jest.requireActual('../../../hooks/useAdminPageNavigator')
  return {
    ...actual,
    useAdminPageNavigator: jest.fn(),
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
const mockUseGetAllCouriersQuery = useGetAllCouriersQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock
const mockUseAdminPageNavigator = useAdminPageNavigator as jest.Mock

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
  dropoffName: 'Giannis S.',
  dropoffPhoneNumber: '+306911111111',
  dropoffBusinessName: null,
  dropoffLocationId: 'loc-d1',
  dropoffReadyAt: new Date('2026-07-30T10:15:00Z'),
  dropoffDeadlineAt: new Date('2026-07-30T10:45:00Z'),
  deliverableAction: 'LEAVE_AT_DOOR',
  undeliverableAction: 'RETURN_TO_STORE',
  deliveryQuoteId: 'q-100',
  deliveryTypes: ['STANDARD'],
  pickupTypes: ['STORE'],
  customerNotes: [],
  requiresDropoffSignature: false,
  requiresId: false,
  orderItems: [],
  createdAt: new Date('2026-07-30T09:00:00Z'),
  updatedAt: new Date('2026-07-30T09:00:00Z'),
} as unknown as DeliveryAdminDto

describe('DeliveryDetails component', () => {
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
    mockUseGetAllCouriersQuery.mockReturnValue({ data: [], isLoading: false })
    mockUseGetInstanceConfigQuery.mockReturnValue({ data: {}, isLoading: false })
    mockUseAdminPageNavigator.mockReturnValue({
      goToDeliveries: jest.fn(),
    })
  })

  it('renders loading state when API query is loading', () => {
    mockUseGetDeliveryQuery.mockReturnValue({ data: undefined, isLoading: true })
    render(<DeliveryDetails deliveryId="d100" />)
    expect(screen.getByText('Loading delivery data.')).toBeInTheDocument()
  })

  it('renders error message state when delivery data is unavailable', () => {
    mockUseGetDeliveryQuery.mockReturnValue({ data: undefined, isLoading: false })
    render(<DeliveryDetails deliveryId="d100" />)
    expect(screen.getByText('There was a problem loading data.')).toBeInTheDocument()
  })

  describe('Money formatting per Delivery currencyCode (Test Plan B)', () => {
    it('Case 1: EUR delivery renders exact euro amounts for all six money rows', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      // Assert exact formatted strings are rendered
      expect(screen.getByText('€112.04')).toBeInTheDocument() // Order total
      expect(screen.getByText('€5.00')).toBeInTheDocument() // Total cost
      expect(screen.getByText('€3.00')).toBeInTheDocument() // Fee
      expect(screen.getByText('€2.50')).toBeInTheDocument() // Pay
      expect(screen.getByText('€1.00')).toBeInTheDocument() // Tips
      expect(screen.getByText('€3.50')).toBeInTheDocument() // Total compensation
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

    it('Case 5: null money fields display em dash (—) scoped to their respective label rows', () => {
      const nullMoneyDelivery = {
        ...sampleEurDelivery,
        fee: null,
        tips: null,
      }
      mockUseGetDeliveryQuery.mockReturnValue({ data: nullMoneyDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      // Find the Fee label container and assert its value text is '—'
      const feeLabel = screen.getByText(/Co-op fee/).closest('label')
      expect(feeLabel).toHaveTextContent('—')

      // Find the Tips label container and assert its value text is '—'
      const tipsLabel = screen.getByText('Tips').closest('label')
      expect(tipsLabel).toHaveTextContent('—')
    })

    it('Case 6: Currency row still displays the raw currencyCode string', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      const currencyLabel = screen.getByText('Currency').closest('label')
      expect(currencyLabel).toHaveTextContent('EUR')
    })
  })

  describe('Price breakdown card (AC-7)', () => {
    it('renders Price breakdown card with base fee €2.00, distance fee €1.07, rider pay €3.07, "Co-op fee (10%)" €0.31 and customer total €3.38', () => {
      const ac7Delivery: DeliveryAdminDto = {
        ...sampleEurDelivery,
        baseFee: 200,
        distanceFee: 107,
        totalCompensation: 307,
        fee: 31,
        feePercentage: 10,
        totalCost: 338,
        currencyCode: 'EUR',
      } as unknown as DeliveryAdminDto

      mockUseGetDeliveryQuery.mockReturnValue({ data: ac7Delivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Price breakdown')).toBeInTheDocument()

      const baseFeeRow = screen.getByText('Base fee').closest('label')
      expect(baseFeeRow).toHaveTextContent('€2.00')

      const distanceFeeRow = screen.getByText('Distance fee').closest('label')
      expect(distanceFeeRow).toHaveTextContent('€1.07')

      const riderPayRow = screen.getByText('Rider pay (base fee + distance fee)').closest('label')
      expect(riderPayRow).toHaveTextContent('€3.07')

      const coopFeeRow = screen.getByText('Co-op fee (10%)').closest('label')
      expect(coopFeeRow).toHaveTextContent('€0.31')

      const customerTotalRow = screen.getByText('Customer total').closest('label')
      expect(customerTotalRow).toHaveTextContent('€3.38')

      // Since pay fields are present, the "not offered yet" note is absent
      expect(
        screen.queryByText(
          'Rider pay, co-op fee and customer total are set when the delivery is first offered to a rider.'
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
        currencyCode: 'EUR',
      } as unknown as DeliveryAdminDto

      mockUseGetDeliveryQuery.mockReturnValue({ data: unofferedDelivery, isLoading: false })

      render(<DeliveryDetails deliveryId="d100" />)

      expect(
        screen.getByText(
          'Rider pay, co-op fee and customer total are set when the delivery is first offered to a rider.'
        )
      ).toBeInTheDocument()

      const baseFeeRow = screen.getByText('Base fee').closest('label')
      expect(baseFeeRow).toHaveTextContent('—')

      const distanceFeeRow = screen.getByText('Distance fee').closest('label')
      expect(distanceFeeRow).toHaveTextContent('—')

      const riderPayRow = screen.getByText('Rider pay (base fee + distance fee)').closest('label')
      expect(riderPayRow).toHaveTextContent('—')

      const coopFeeRow = screen.getByText('Co-op fee').closest('label')
      expect(coopFeeRow).toHaveTextContent('—')

      const customerTotalRow = screen.getByText('Customer total').closest('label')
      expect(customerTotalRow).toHaveTextContent('—')
    })
  })

  describe('Schedule date formatting & epoch trap guard', () => {
    it('renders em dash (—) and not "January 1, 1970" for epoch dates across all five schedule rows', () => {
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

      const scheduleLabels = [
        'Pickup ready',
        'Pickup deadline',
        'Drop-off ready',
        'Drop-off ETA',
        'Drop-off deadline',
      ]

      for (const labelText of scheduleLabels) {
        const label = screen.getByText(labelText).closest('label')
        expect(label).toHaveTextContent('—')
        expect(label).not.toHaveTextContent('January 1, 1970')
      }

      expect(container.textContent).not.toContain('January 1, 1970')
    })
  })

  describe('Delivery Event action menu & error handling', () => {
    it('submits delivery event when confirmed by user on menu trigger', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({ unwrap: () => Promise.resolve({}) })

      render(<DeliveryDetails deliveryId="d100" />)

      // Open menu trigger
      const triggerBtn = screen.getByText('Trigger event')
      fireEvent.click(triggerBtn)

      // Click event item (e.g. Arrived_at_pickup_location)
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

      fireEvent.click(screen.getByText('Trigger event'))
      fireEvent.click(screen.getByText(/Arrived_at_pickup_location/i))

      expect(await screen.findByText('Delivery status transition failed')).toBeInTheDocument()
      expect(screen.getByText('Failed to change delivery status')).toBeInTheDocument()

      confirmSpy.mockRestore()
    })
  })

  describe('DeliveryEventTimeline integration & regression guards (Test Plan C)', () => {
    it('renders the DeliveryEventTimeline component with stubbed event history', () => {
      render(<DeliveryDetails deliveryId="d100" />)

      expect(screen.getByText('Delivery events')).toBeInTheDocument()
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
})
