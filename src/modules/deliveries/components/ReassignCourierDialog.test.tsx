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
import { BOX_OVER_CAPACITY_WARNING_ID } from './BoxOverCapacityWarning'

// Mock Radix Select primitive using React Context so deep SelectItems update state in JSDOM tests
jest.mock('@radix-ui/react-select', () => {
  // `as typeof import('react')` because a bare require() is untyped, and an untyped call
  // cannot take the type argument used on createContext below (TS2347).
  const React = require('react') as typeof import('react')
  const SelectContext = React.createContext<{
    onValueChange?: (v: string) => void
    disabled?: boolean
  }>({})
  return {
    Root: ({ children, onValueChange, disabled }: any) => (
      <SelectContext.Provider value={{ onValueChange, disabled }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, disabled, ...props }: any) => {
      const { disabled: rootDisabled } = React.useContext(SelectContext)
      return (
        <button
          type="button"
          role="combobox"
          disabled={disabled ?? rootDisabled}
          {...props}
        >
          {children}
        </button>
      )
    },
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

  // Spec 0051 (cross check 14, row 108 review ruling: "Deactivated riders in the assign and reassign
  // pickers"): the picker leaves a deactivated rider out. The backend refuses them anyway.
  describe('a deactivated rider is never a replacement (spec 0051, row 108 review)', () => {
    const optionTexts = () => screen.queryAllByRole('option').map((el) => el.textContent ?? '')

    it('lists the active riders and leaves out every rider with deactivatedAt set', async () => {
      mockUseGetAllCouriersQuery.mockReturnValue({
        data: [
          ...sampleCouriers,
          { id: 'c4', firstName: 'Dimitris', lastName: 'Left', phoneNumber: '+306944444444', deactivatedAt: new Date('2026-11-20T09:00:00Z') },
          { id: 'c5', firstName: 'Maria', lastName: 'Back', phoneNumber: '+306955555555', deactivatedAt: null },
        ],
        isLoading: false,
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))
      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      const options = optionTexts()
      expect(options.some((t) => t.includes('Eleni Georgiou'))).toBe(true)
      expect(options.some((t) => t.includes('Yannis Dimitriou'))).toBe(true)
      expect(options.some((t) => t.includes('Maria Back'))).toBe(true)
      expect(options.some((t) => t.includes('Dimitris Left'))).toBe(false)
      expect(screen.queryByText(/Dimitris Left/)).toBeNull()
      expect(screen.queryByText(/\+306944444444/)).toBeNull()
    })

    it('the rider who holds the job is still left out too, deactivated or not', async () => {
      mockUseGetAllCouriersQuery.mockReturnValue({
        data: [
          { id: 'c1', firstName: 'Nikos', lastName: 'Papadopoulos' },
          { id: 'c2', firstName: 'Eleni', lastName: 'Georgiou', deactivatedAt: new Date('2026-11-20T09:00:00Z') },
          { id: 'c3', firstName: 'Yannis', lastName: 'Dimitriou' },
        ],
        isLoading: false,
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))
      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      const riders = optionTexts().filter((t) => /Papadopoulos|Georgiou|Dimitriou/.test(t))
      expect(riders).toHaveLength(1)
      expect(riders[0]).toContain('Yannis Dimitriou')
    })

    it('a deactivated rider cannot be sent as the new rider: only an active one is submitted', async () => {
      mockReassignDeliveryMutation.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      mockUseGetAllCouriersQuery.mockReturnValue({
        data: [
          ...sampleCouriers,
          { id: 'c4', firstName: 'Dimitris', lastName: 'Left', deactivatedAt: new Date('2026-11-20T09:00:00Z') },
        ],
        isLoading: false,
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))
      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      expect(screen.queryByText(/Dimitris Left/)).toBeNull()
      fireEvent.click(screen.getByText(/Eleni Georgiou/))
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      await waitFor(() => expect(mockReassignDeliveryMutation).toHaveBeenCalledTimes(1))
      expect(JSON.stringify(mockReassignDeliveryMutation.mock.calls[0])).toContain('c2')
      expect(JSON.stringify(mockReassignDeliveryMutation.mock.calls[0])).not.toContain('c4')
    })
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
        confirmOverCapacity: false,
      })
    })

    // Assert window.confirm was not called
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows error toast and keeps dialog open when backend mutation fails', async () => {
    mockReassignDeliveryMutation.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 400, message: 'Delivery is already assigned to this courier' }),
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
    expect(screen.queryByRole('alert')).toBeNull()
  })

  describe('over capacity warning and confirm step (spec 0043, AC-6, AC-8)', () => {
    it('after 409 BOX_OVER_CAPACITY for rider A: warning names numbers, confirm button stays disabled until tick box is ticked, then sends confirmOverCapacity true (spec 0043, AC-6, AC-8)', async () => {
      // First attempt fails with 409 BOX_OVER_CAPACITY
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () =>
          Promise.reject({
            code: 'BOX_OVER_CAPACITY',
            heldUnits: 40,
            deliveryUnits: 70,
          }),
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      // Select replacement rider c2 (Eleni)
      fireEvent.click(screen.getByText(/Eleni Georgiou/))

      const submitButton = screen.getByRole('button', { name: /reassign rider/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockReassignDeliveryMutation).toHaveBeenCalledWith({
          deliveryId: 'd1',
          courierId: 'c2',
          payoutPolicy: 'HALF',
          message: undefined,
          confirmOverCapacity: false,
        })
      })

      // Dialog stays open
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Alert is rendered with held, order and total units
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent("This would overfill the rider's box.")
      expect(alert).toHaveTextContent(
        'They already hold 40 of 100 box units, and this order takes 70: 110 in all.'
      )

      // Button now reads "Reassign anyway" and stays disabled until tick box is ticked
      const confirmButton = screen.getByRole('button', { name: /reassign anyway/i })
      expect(confirmButton).toBeDisabled()

      // Tick the confirmation checkbox
      const checkbox = screen.getByRole('checkbox', {
        name: /I checked with the rider that this order fits/i,
      })
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      // Button is now enabled
      expect(confirmButton).not.toBeDisabled()

      // Second press succeeds with confirmOverCapacity: true for rider c2
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ ...sampleDelivery, courierId: 'c2' }),
      })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockReassignDeliveryMutation).toHaveBeenLastCalledWith({
          deliveryId: 'd1',
          courierId: 'c2',
          payoutPolicy: 'HALF',
          message: undefined,
          confirmOverCapacity: true,
        })
      })

      // Dialog closes on success
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
      })
    })

    it('choosing rider B after A warning hides the warning and the next press sends confirmOverCapacity false for B', async () => {
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () =>
          Promise.reject({
            code: 'BOX_OVER_CAPACITY',
            heldUnits: 40,
            deliveryUnits: 70,
          }),
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))
      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      fireEvent.click(screen.getByText(/Eleni Georgiou/))
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      // Warning alert is visible
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reassign anyway/i })).toBeInTheDocument()

      // Pick a different rider (c3, Yannis Dimitriou)
      fireEvent.click(screen.getByText(/Yannis Dimitriou/))

      // Warning alert disappears and button reverts to "Reassign rider"
      expect(screen.queryByRole('alert')).toBeNull()
      const submitButton = screen.getByRole('button', { name: /reassign rider/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()

      // Next press sends confirmOverCapacity: false for Yannis
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ ...sampleDelivery, courierId: 'c3' }),
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockReassignDeliveryMutation).toHaveBeenLastCalledWith({
          deliveryId: 'd1',
          courierId: 'c3',
          payoutPolicy: 'HALF',
          message: undefined,
          confirmOverCapacity: false,
        })
      })
    })

    it('the rider select is disabled while the request is in flight (spec 0043, review fix)', async () => {
      mockUseReassignDeliveryMutation.mockReturnValue([
        mockReassignDeliveryMutation,
        { isLoading: true },
      ])

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()

      const comboboxes = screen.getAllByRole('combobox')
      const riderSelect = comboboxes[0]
      expect(riderSelect).toBeDisabled()
    })

    it('a 409 that arrives while rider A is chosen never confirms for anyone without the tick (spec 0043, review fix)', async () => {
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () =>
          Promise.reject({
            code: 'BOX_OVER_CAPACITY',
            heldUnits: 40,
            deliveryUnits: 70,
          }),
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
      fireEvent.click(screen.getByText(/Eleni Georgiou/))
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      await screen.findByRole('alert')
      const confirmButton = screen.getByRole('button', { name: /reassign anyway/i })

      // Without tick, button is disabled
      expect(confirmButton).toBeDisabled()
      const checkbox = screen.getByRole('checkbox', {
        name: /I checked with the rider that this order fits/i,
      })
      expect(checkbox).not.toBeChecked()

      // Attempting to click disabled confirm button does not dispatch mutation again
      fireEvent.click(confirmButton)
      expect(mockReassignDeliveryMutation).toHaveBeenCalledTimes(1)
    })

    it('the confirm button is described by the warning only while the warning shows (spec 0043, review fix)', async () => {
      mockReassignDeliveryMutation.mockReturnValueOnce({
        unwrap: () =>
          Promise.reject({
            code: 'BOX_OVER_CAPACITY',
            heldUnits: 40,
            deliveryUnits: 70,
          }),
      })

      render(<ReassignCourierDialog delivery={sampleDelivery} />)
      fireEvent.click(screen.getByRole('button', { name: /reassign rider/i }))

      expect(await screen.findByText(/reassign delivery/i)).toBeInTheDocument()
      fireEvent.click(screen.getByText(/Eleni Georgiou/))

      const submitButton = screen.getByRole('button', { name: /reassign rider/i })
      expect(submitButton).not.toHaveAttribute('aria-describedby')

      fireEvent.click(submitButton)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveAttribute('id', BOX_OVER_CAPACITY_WARNING_ID)

      const confirmButton = screen.getByRole('button', { name: /reassign anyway/i })
      expect(confirmButton).toHaveAttribute('aria-describedby', BOX_OVER_CAPACITY_WARNING_ID)

      // Changing rider clears aria-describedby
      fireEvent.click(screen.getByText(/Yannis Dimitriou/))
      const submitButtonB = screen.getByRole('button', { name: /reassign rider/i })
      expect(submitButtonB).not.toHaveAttribute('aria-describedby')
    })
  })
})
