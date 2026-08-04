import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  ReassignCourierDialog,
  canReassignDelivery,
} from './ReassignCourierDialog'
import { Toaster } from '../../../admin-web-components'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryStatus } from '../../../shared-types'
import { useReassignDeliveryMutation } from '../../../api/deliveriesApi'
import { useGetAllCouriersQuery } from '../../../api/couriersApi'
import { useGetInstanceConfigQuery } from '../../../api/configApi'

// Mock Radix Select primitive using React Context so deep SelectItems update state in JSDOM tests
jest.mock('@radix-ui/react-select', () => {
  // `as typeof import('react')` because a bare require() is untyped, and an untyped call
  // cannot take the type argument used on createContext below (TS2347).
  const React = require('react') as typeof import('react')
  const SelectContext = React.createContext<{ onValueChange?: (v: string) => void }>({})
  return {
    Root: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => <button type="button" role="combobox" {...props}>{children}</button>,
    Value: ({ placeholder, children }: any) => <span>{children || placeholder}</span>,
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = React.useContext(SelectContext)
      return (
        <div
          role="option"
          onClick={() => onValueChange && onValueChange(value)}
          {...props}
        >
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
  useReassignDeliveryMutation: jest.fn(),
}))

jest.mock('../../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(),
}))

jest.mock('../../../api/configApi', () => ({
  useGetInstanceConfigQuery: jest.fn(),
}))

const mockReassignDeliveryMutation = jest.fn()
const mockUseReassignDeliveryMutation = useReassignDeliveryMutation as jest.Mock
const mockUseGetAllCouriersQuery = useGetAllCouriersQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock

const sampleCouriers = [
  { id: 'c1', firstName: 'Nikos', lastName: 'Papadopoulos', phoneNumber: '+306911111111' },
  { id: 'c2', firstName: 'Eleni', lastName: 'Georgiou', phoneNumber: '+306922222222' },
  { id: 'c3', firstName: 'Yannis', lastName: 'Dimitriou', phoneNumber: '+306933333333' },
]

const sampleDelivery = {
  id: 'd1',
  orderReference: 'ORD-100',
  status: EnumDeliveryStatus.DISPATCHED as any,
  courierId: 'c1',
  totalCompensation: 800,
  currencyCode: 'EUR',
  pickupAddress: null as any,
  dropoffAddress: null as any,
  createdAt: new Date(),
} as unknown as DeliveryAdminDto

describe('ReassignCourierDialog component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReassignDeliveryMutation.mockReturnValue([
      mockReassignDeliveryMutation,
      { isLoading: false },
    ])
    mockUseGetAllCouriersQuery.mockReturnValue({
      data: sampleCouriers,
      isLoading: false,
    })
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        reassignmentPayoutPolicies: {
          FULL: 100,
          HALF: 50,
        },
        reassignmentPayoutDefaultPolicy: 'HALF',
      },
      isLoading: false,
    })
  })

  describe('canReassignDelivery helper', () => {
    it('evaluates truth table correctly across all delivery statuses and courierId presence', () => {
      const allowedStatuses = [
        EnumDeliveryStatus.ACCEPTED,
        EnumDeliveryStatus.DISPATCHED,
        EnumDeliveryStatus.COURIER_ARRIVED_AT_PICKUP_LOCATION,
        EnumDeliveryStatus.PICKED_UP,
        EnumDeliveryStatus.ON_THE_WAY,
        EnumDeliveryStatus.COURIER_ARRIVED_AT_DROPOFF_LOCATION,
      ]

      const forbiddenStatuses = [
        EnumDeliveryStatus.CREATED,
        EnumDeliveryStatus.ASSIGNING_COURIER, // ASSIGNING_COURIER is handled by AssignCourierCell
        EnumDeliveryStatus.DROPPED_OFF,
        EnumDeliveryStatus.CANCELED,
        EnumDeliveryStatus.FAILED,
      ]

      allowedStatuses.forEach((status) => {
        const testDelivery = { ...sampleDelivery, status: status as any, courierId: 'c1' }
        expect(canReassignDelivery(testDelivery)).toBe(true)
      })

      forbiddenStatuses.forEach((status) => {
        const testDelivery = { ...sampleDelivery, status: status as any, courierId: 'c1' }
        expect(canReassignDelivery(testDelivery)).toBe(false)
      })

      // Must be false if courierId is missing/null even on ACCEPTED status
      const noCourierDelivery = { ...sampleDelivery, status: EnumDeliveryStatus.ACCEPTED as any, courierId: null }
      expect(canReassignDelivery(noCourierDelivery)).toBe(false)
    })
  })

  it('renders nothing when canReassignDelivery returns false', () => {
    const unassignableDelivery = {
      ...sampleDelivery,
      status: EnumDeliveryStatus.ASSIGNING_COURIER as any,
    }
    const { container } = render(<ReassignCourierDialog delivery={unassignableDelivery} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders policy options per custom config keys and preselects default on open', async () => {
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        reassignmentPayoutPolicies: {
          CUSTOM_POLICY_A: 80,
          CUSTOM_POLICY_B: 40,
        },
        reassignmentPayoutDefaultPolicy: 'CUSTOM_POLICY_B',
      },
      isLoading: false,
    })

    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    const trigger = screen.getByRole('button', { name: /reassign rider/i })
    fireEvent.click(trigger)

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
    expect(screen.getByText(/CUSTOM_POLICY_B — 40% of piece-rate \(default\)/i)).toBeInTheDocument()
  })

  it('contains no free-text amount input field', async () => {
    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/amount/i)).toBeNull()
    expect(screen.queryByLabelText(/payout amount/i)).toBeNull()
    expect(screen.queryByLabelText(/compensation amount/i)).toBeNull()
  })

  it('discloses compensation amount using delivery currencyCode (EUR) and not a hard-coded $', async () => {
    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
    // 800 cents * 50% = 400 cents => €4.00
    expect(screen.getByText('€4.00')).toBeInTheDocument()
    expect(screen.queryByText(/\$4\.00/i)).toBeNull()
  })

  it('excludes the current assigned courier from replacement rider options', async () => {
    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
    expect(screen.getByText(/Eleni Georgiou/)).toBeInTheDocument()
    expect(screen.getByText(/Yannis Dimitriou/)).toBeInTheDocument()
    // c1 (Nikos) is only in current rider text, not in select options
    const optionElements = screen.getAllByRole('option')
    const optionTexts = optionElements.map((el) => el.textContent)
    expect(optionTexts.some((t) => t?.includes('Nikos Papadopoulos'))).toBe(false)
  })

  it('disables submit button and shows error when instance config has invalid policy percentage', async () => {
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        reassignmentPayoutPolicies: { BAD: 150 },
        reassignmentPayoutDefaultPolicy: 'BAD',
      },
      isLoading: false,
    })

    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/invalid percentage 150/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /reassign rider/i })
    expect(submitBtn).toBeDisabled()
    expect(mockReassignDeliveryMutation).not.toHaveBeenCalled()
  })

  it('submits exact payload and does not trigger native window.confirm on happy path', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true)
    mockReassignDeliveryMutation.mockReturnValue({
      unwrap: () => Promise.resolve({ ...sampleDelivery, courierId: 'c2' }),
    })

    render(<ReassignCourierDialog delivery={sampleDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

    // Pick replacement rider c2 (Eleni)
    const option = screen.getByText(/Eleni Georgiou/)
    fireEvent.click(option)

    // Fill note
    const noteInput = screen.getByLabelText(/reason — recorded on the deliveryevent/i)
    fireEvent.change(noteInput, { target: { value: 'moped broke down' } })

    // Click submit in dialog footer
    const submitButton = screen.getByRole('button', { name: /reassign rider/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockReassignDeliveryMutation).toHaveBeenCalledTimes(1)
      expect(mockReassignDeliveryMutation).toHaveBeenCalledWith({
        deliveryId: 'd1',
        courierId: 'c2',
        payoutPolicy: 'HALF',
        message: 'moped broke down',
      })
    })

    // Assert window.confirm was not called
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows error toast and keeps dialog open when backend mutation fails', async () => {
    mockReassignDeliveryMutation.mockReturnValue({
      unwrap: () => Promise.reject({ message: 'Delivery is already assigned to this courier' }),
    })

    render(
      <>
        <Toaster />
        <ReassignCourierDialog delivery={sampleDelivery} />
      </>
    )
    fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

    expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

    const option = screen.getByText(/Eleni Georgiou/)
    fireEvent.click(option)

    const submitButton = screen.getByRole('button', { name: /reassign rider/i })
    fireEvent.click(submitButton)

    expect(await screen.findByText('Delivery is already assigned to this courier')).toBeInTheDocument()
    // Dialog remains open for retry
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
