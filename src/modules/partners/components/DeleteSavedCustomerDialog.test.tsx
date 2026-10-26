import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteSavedCustomerDialog } from './DeleteSavedCustomerDialog'
import { useDeletePartnerCustomerMutation } from '../../../api/savedCustomersApi'
import type { SavedCustomerAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/savedCustomersApi', () => ({
  useDeletePartnerCustomerMutation: jest.fn(),
}))

const mockUseDeletePartnerCustomerMutation = useDeletePartnerCustomerMutation as jest.Mock

const sampleCustomer: SavedCustomerAdminDto = {
  id: 'cust-1',
  name: 'Maria Papadopoulou',
  phone: '+306912345678',
  addressLine1: 'Iasonos 10',
  addressLine2: 'Floor 3',
  city: 'Volos',
  zipCode: '38221',
  latitude: 39.362,
  longitude: 22.942,
  formattedAddress: 'Iasonos 10, Volos 38221',
  notes: 'Ring 3rd floor bell',
  lastUsedAt: '2026-10-26T10:00:00.000Z',
  createdAt: '2026-10-26T09:00:00.000Z',
  updatedAt: '2026-10-26T09:00:00.000Z',
}

describe('DeleteSavedCustomerDialog (spec 0005, AC-6)', () => {
  const mockDeleteCustomer = jest.fn()
  const mockOnClose = jest.fn()
  const mockOnDeleted = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDeletePartnerCustomerMutation.mockReturnValue([
      mockDeleteCustomer,
      { isLoading: false },
    ])
  })

  it('asks first with the customer\'s name and says the deletion is logged', () => {
    render(
      <DeleteSavedCustomerDialog
        partnerId="partner-1"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    )

    expect(screen.getByRole('heading', { name: 'Delete Maria Papadopoulou?' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Their saved name, phone and address are removed for good. Past orders keep their own copy. The deletion is logged with your admin account.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('on success calls delete mutation and onDeleted with customer id', async () => {
    mockDeleteCustomer.mockReturnValue({
      unwrap: () => Promise.resolve(),
    })

    render(
      <DeleteSavedCustomerDialog
        partnerId="partner-1"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDeleteCustomer).toHaveBeenCalledTimes(1)
      expect(mockDeleteCustomer).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        id: 'cust-1',
      })
      expect(mockOnDeleted).toHaveBeenCalledWith('cust-1')
    })
  })

  it('on a 404 (already deleted elsewhere) calls onDeleted with customer id', async () => {
    mockDeleteCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 404 }),
    })

    render(
      <DeleteSavedCustomerDialog
        partnerId="partner-1"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockOnDeleted).toHaveBeenCalledWith('cust-1')
    })
  })

  it('on another error the dialog stays open with an error message', async () => {
    mockDeleteCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 500 }),
    })

    render(
      <DeleteSavedCustomerDialog
        partnerId="partner-1"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(
        screen.getByText('The customer could not be deleted. Try again in a moment.')
      ).toBeInTheDocument()
    })

    // Dialog stays open: onDeleted is NOT called
    expect(mockOnDeleted).not.toHaveBeenCalled()
  })
})
