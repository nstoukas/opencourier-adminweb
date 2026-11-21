import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  AssignCourierCell,
  isDeliveryAwaitingCourierAssignment,
} from './AssignCourierCell'
import { DeliveryAdminDtoStatusEnum } from '@/backend-admin-sdk'
import { useAssignDeliveryToCourierMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'
import { Toaster } from '../../../admin-web-components'
import { BOX_OVER_CAPACITY_WARNING_ID } from './BoxOverCapacityWarning'

// Mock Radix Select primitive using React Context so SelectItems update state in JSDOM tests
jest.mock('@radix-ui/react-select', () => {
  const MockReact = require('react') as typeof import('react')
  const SelectContext = MockReact.createContext<{
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
      const { disabled: rootDisabled } = MockReact.useContext(SelectContext)
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
      const { onValueChange } = MockReact.useContext(SelectContext)
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

const mockAssignCourierUnwrap = jest.fn()
const mockAssignCourier = jest.fn(() => ({ unwrap: mockAssignCourierUnwrap }))

jest.mock('../../../api/deliveriesApi', () => ({
  useAssignDeliveryToCourierMutation: jest.fn(),
}))

jest.mock('../../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(),
}))

const mockUseAssignDeliveryToCourierMutation = useAssignDeliveryToCourierMutation as jest.Mock
const mockUseGetAllCouriersQuery = useGetAllCouriersQuery as jest.Mock

describe('AssignCourierCell (spec 0034, AC-4, AC-5)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAssignCourierUnwrap.mockResolvedValue({})
    mockUseAssignDeliveryToCourierMutation.mockReturnValue([
      mockAssignCourier,
      { isLoading: false },
    ])
    mockUseGetAllCouriersQuery.mockReturnValue({
      data: [
        { id: 'c-1', firstName: 'Alice', lastName: 'Courier', user: { name: 'Alice Courier' } },
        { id: 'c-2', firstName: 'Bob', lastName: 'Courier', user: { name: 'Bob Courier' } },
      ],
      isLoading: false,
    })
  })

  describe('isDeliveryAwaitingCourierAssignment unit logic', () => {
    it('returns true only when status is ASSIGNING_COURIER and courierId is falsy', () => {
      expect(
        isDeliveryAwaitingCourierAssignment({
          id: 'del-1',
          status: DeliveryAdminDtoStatusEnum.AssigningCourier,
          courierId: null,
        })
      ).toBe(true)

      expect(
        isDeliveryAwaitingCourierAssignment({
          id: 'del-2',
          status: DeliveryAdminDtoStatusEnum.AssigningCourier,
          courierId: 'already-assigned',
        })
      ).toBe(false)

      expect(
        isDeliveryAwaitingCourierAssignment({
          id: 'del-3',
          status: DeliveryAdminDtoStatusEnum.Accepted,
          courierId: null,
        })
      ).toBe(false)
    })
  })

  it('renders "Assign Courier" button directly from row fields without fetching full delivery first', () => {
    // Narrowed Pick<DeliveryAdminDto, 'id' | 'status' | 'courierId'>
    const partialDelivery = {
      id: 'del-board-1',
      status: DeliveryAdminDtoStatusEnum.AssigningCourier,
      courierId: null,
    }

    render(<AssignCourierCell delivery={partialDelivery} />)

    const assignButton = screen.getByRole('button', { name: /Assign Courier/i })
    expect(assignButton).toBeInTheDocument()

    // Query for couriers is skipped while dialog is closed
    expect(mockUseGetAllCouriersQuery).toHaveBeenCalledWith(undefined, { skip: true })
  })

  it('clicking Assign Courier opens the dialog and triggers couriers query (skip: false)', () => {
    const partialDelivery = {
      id: 'del-board-2',
      status: DeliveryAdminDtoStatusEnum.AssigningCourier,
      courierId: null,
    }

    render(<AssignCourierCell delivery={partialDelivery} />)

    const assignButton = screen.getByRole('button', { name: /Assign Courier/i })
    fireEvent.click(assignButton)

    // Dialog title is visible
    expect(screen.getByRole('heading', { name: /Assign courier/i })).toBeInTheDocument()

    // Query now executed with skip: false
    expect(mockUseGetAllCouriersQuery).toHaveBeenCalledWith(undefined, { skip: false })
  })

  it('renders nothing if delivery is not awaiting assignment', () => {
    const assignedDelivery = {
      id: 'del-board-3',
      status: DeliveryAdminDtoStatusEnum.Accepted,
      courierId: 'courier-1',
    }

    const { container } = render(<AssignCourierCell delivery={assignedDelivery} />)
    expect(container.firstChild).toBeNull()
  })

  describe('over capacity warning and confirm step (spec 0043, AC-6, AC-8)', () => {
    const delivery = {
      id: 'del-board-409',
      status: DeliveryAdminDtoStatusEnum.AssigningCourier,
      courierId: null,
    }

    it('after 409 BOX_OVER_CAPACITY for rider A: warning names numbers, confirm button stays disabled until tick box is ticked, then sends confirmOverCapacity true (spec 0043, AC-6, AC-8)', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: 60,
      })

      render(<AssignCourierCell delivery={delivery} />)

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      expect(screen.getByRole('heading', { name: /Assign courier/i })).toBeInTheDocument()

      // Select Courier Alice (c-1)
      fireEvent.click(screen.getByText(/Alice Courier/))

      // Initial submit button says "Assign courier"
      const submitButton = screen.getByRole('button', { name: 'Assign courier' })
      expect(submitButton).toBeInTheDocument()

      // First click: sends confirmOverCapacity: false
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAssignCourier).toHaveBeenCalledWith({
          deliveryId: 'del-board-409',
          courierId: 'c-1',
          confirmOverCapacity: false,
        })
      })

      // Dialog stays open
      expect(screen.getByRole('heading', { name: /Assign courier/i })).toBeInTheDocument()

      // Warning alert is displayed with held, order and total units
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent("This would overfill the rider's box.")
      expect(alert).toHaveTextContent(
        'They already hold 50 of 100 box units, and this order takes 60: 110 in all.'
      )

      // Button now reads "Assign anyway" and is disabled until tick box is ticked
      const confirmButton = screen.getByRole('button', { name: 'Assign anyway' })
      expect(confirmButton).toBeDisabled()

      // Tick the confirmation checkbox
      const checkbox = screen.getByRole('checkbox', {
        name: /I checked with the rider that this order fits/i,
      })
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      // Confirm button is now enabled
      expect(confirmButton).not.toBeDisabled()

      // Second attempt succeeds with confirmOverCapacity: true for rider A
      mockAssignCourierUnwrap.mockResolvedValueOnce({})
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockAssignCourier).toHaveBeenLastCalledWith({
          deliveryId: 'del-board-409',
          courierId: 'c-1',
          confirmOverCapacity: true,
        })
      })

      // On success, dialog closes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /Assign courier/i })).toBeNull()
      })
    })

    it('choosing rider B after A warning hides the warning and the next press sends confirmOverCapacity false for B', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: 60,
      })

      render(<AssignCourierCell delivery={delivery} />)

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      fireEvent.click(screen.getByText(/Alice Courier/))
      fireEvent.click(screen.getByRole('button', { name: 'Assign courier' }))

      // Warning is displayed
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Assign anyway' })).toBeInTheDocument()

      // User selects a different rider (Courier Bob, c-2)
      fireEvent.click(screen.getByText(/Bob Courier/))

      // Warning alert disappears and button reverts to "Assign courier"
      expect(screen.queryByRole('alert')).toBeNull()
      const submitButton = screen.getByRole('button', { name: 'Assign courier' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()

      // Next press sends confirmOverCapacity: false for rider B
      mockAssignCourierUnwrap.mockResolvedValueOnce({})
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAssignCourier).toHaveBeenLastCalledWith({
          deliveryId: 'del-board-409',
          courierId: 'c-2',
          confirmOverCapacity: false,
        })
      })
    })

    it('the rider select is disabled while the request is in flight (spec 0043, review fix)', () => {
      // Simulate in-flight mutation
      mockUseAssignDeliveryToCourierMutation.mockReturnValue([
        mockAssignCourier,
        { isLoading: true },
      ])

      render(<AssignCourierCell delivery={delivery} />)

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))

      const selectTrigger = screen.getByRole('combobox')
      expect(selectTrigger).toBeDisabled()
    })

    it('a 409 that arrives while rider A is chosen never confirms for anyone without the tick (spec 0043, review fix)', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: 60,
      })

      render(<AssignCourierCell delivery={delivery} />)

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      fireEvent.click(screen.getByText(/Alice Courier/))
      fireEvent.click(screen.getByRole('button', { name: 'Assign courier' }))

      await screen.findByRole('alert')
      const confirmButton = screen.getByRole('button', { name: 'Assign anyway' })

      // Without the tick, button is disabled
      expect(confirmButton).toBeDisabled()
      const checkbox = screen.getByRole('checkbox', {
        name: /I checked with the rider that this order fits/i,
      })
      expect(checkbox).not.toBeChecked()

      // Attempting to click disabled confirm button does not dispatch mutation
      fireEvent.click(confirmButton)
      expect(mockAssignCourier).toHaveBeenCalledTimes(1)
    })

    it('Cancel then reopen shows no warning and the first press sends confirmOverCapacity false (spec 0043, review fix)', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: 60,
      })

      render(<AssignCourierCell delivery={delivery} />)

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      fireEvent.click(screen.getByText(/Alice Courier/))
      fireEvent.click(screen.getByRole('button', { name: 'Assign courier' }))

      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Assign anyway' })).toBeInTheDocument()

      // Click Cancel
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /Assign courier/i })).toBeNull()
      })

      // Reopen dialog
      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      expect(screen.getByRole('heading', { name: /Assign courier/i })).toBeInTheDocument()

      // Warning alert is not shown on reopen
      expect(screen.queryByRole('alert')).toBeNull()

      // Choose rider A again
      fireEvent.click(screen.getByText(/Alice Courier/))

      // Button is "Assign courier", not "Assign anyway"
      const submitButton = screen.getByRole('button', { name: 'Assign courier' })
      expect(submitButton).toBeInTheDocument()

      // Pressing it sends confirmOverCapacity: false
      mockAssignCourierUnwrap.mockResolvedValueOnce({})
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAssignCourier).toHaveBeenLastCalledWith({
          deliveryId: 'del-board-409',
          courierId: 'c-1',
          confirmOverCapacity: false,
        })
      })
    })

    it('the confirm button is described by the warning only while the warning shows (spec 0043, review fix)', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: 60,
      })

      render(<AssignCourierCell delivery={delivery} />)

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      fireEvent.click(screen.getByText(/Alice Courier/))

      const submitButton = screen.getByRole('button', { name: 'Assign courier' })
      expect(submitButton).not.toHaveAttribute('aria-describedby')

      fireEvent.click(submitButton)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveAttribute('id', BOX_OVER_CAPACITY_WARNING_ID)

      const confirmButton = screen.getByRole('button', { name: 'Assign anyway' })
      expect(confirmButton).toHaveAttribute('aria-describedby', BOX_OVER_CAPACITY_WARNING_ID)

      // Changing rider clears aria-describedby
      fireEvent.click(screen.getByText(/Bob Courier/))
      const submitButtonB = screen.getByRole('button', { name: 'Assign courier' })
      expect(submitButtonB).not.toHaveAttribute('aria-describedby')
    })

    it('shows toast and does NOT show box warning on any other error', async () => {
      mockAssignCourierUnwrap.mockRejectedValueOnce(new Error('Network error'))

      render(
        <>
          <Toaster />
          <AssignCourierCell delivery={delivery} />
        </>
      )

      fireEvent.click(screen.getByRole('button', { name: /Assign Courier/i }))
      fireEvent.click(screen.getByText(/Alice Courier/))
      fireEvent.click(screen.getByRole('button', { name: 'Assign courier' }))

      // Shows error toast, keeps dialog open, and no box warning is shown
      expect(await screen.findByText('Assignment failed')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByRole('button', { name: 'Assign courier' })).toBeInTheDocument()
    })
  })
})
