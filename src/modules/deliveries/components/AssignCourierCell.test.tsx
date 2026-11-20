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

// Mock Radix Select primitive using React Context so SelectItems update state in JSDOM tests
jest.mock('@radix-ui/react-select', () => {
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

    it('on 409 BOX_OVER_CAPACITY: keeps dialog open, shows alert with units, and button reads "Assign anyway"; pressing it sends confirmOverCapacity: true', async () => {
      // First attempt fails with 409 BOX_OVER_CAPACITY
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

      // Button now reads "Assign anyway"
      const confirmButton = screen.getByRole('button', { name: 'Assign anyway' })
      expect(confirmButton).toBeInTheDocument()

      // Second attempt succeeds with confirm
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

    it('choosing another rider clears the warning and the next press sends confirmOverCapacity: false', async () => {
      // First attempt for rider 1 triggers 409 BOX_OVER_CAPACITY
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

      // Next press sends confirmOverCapacity: false for the new rider
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
