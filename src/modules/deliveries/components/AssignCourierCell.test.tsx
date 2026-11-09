import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  AssignCourierCell,
  isDeliveryAwaitingCourierAssignment,
} from './AssignCourierCell'
import { DeliveryAdminDtoStatusEnum } from '@/backend-admin-sdk'
import { useAssignDeliveryToCourierMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'

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
        { id: 'c-1', user: { name: 'Courier Alice' } },
        { id: 'c-2', user: { name: 'Courier Bob' } },
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
})
