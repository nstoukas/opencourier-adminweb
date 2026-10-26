import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditSavedCustomerDialog } from './EditSavedCustomerDialog'
import { useUpdatePartnerCustomerMutation } from '../../../api/savedCustomersApi'
import type { SavedCustomerAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/savedCustomersApi', () => ({
  useUpdatePartnerCustomerMutation: jest.fn(),
}))

const mockUseUpdatePartnerCustomerMutation = useUpdatePartnerCustomerMutation as jest.Mock

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

describe('EditSavedCustomerDialog (spec 0005, AC-6)', () => {
  const mockUpdateCustomer = jest.fn()
  const mockOnClose = jest.fn()
  const mockOnSaved = jest.fn()
  const mockOnGone = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUpdatePartnerCustomerMutation.mockReturnValue([
      mockUpdateCustomer,
      { isLoading: false },
    ])
  })

  it('shows Name, Phone, Floor or flat, Notes and the address read only', () => {
    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    expect(screen.getByRole('heading', { name: 'Edit Maria Papadopoulou' })).toBeInTheDocument()
    expect(screen.getByText('A saved customer of Volos Test Kitchen.')).toBeInTheDocument()

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement
    const phoneInput = screen.getByLabelText('Phone') as HTMLInputElement
    const floorInput = screen.getByLabelText(/Floor or flat/i) as HTMLInputElement
    const notesInput = screen.getByLabelText(/Notes for the rider/i) as HTMLTextAreaElement

    expect(nameInput.value).toBe('Maria Papadopoulou')
    expect(phoneInput.value).toBe('+306912345678')
    expect(floorInput.value).toBe('Floor 3')
    expect(notesInput.value).toBe('Ring 3rd floor bell')

    // Address is shown read-only with explanation that address and map point stay as saved
    expect(screen.getByText('Iasonos 10, Volos 38221')).toBeInTheDocument()
    expect(
      screen.getByText('The address and its map point stay as the restaurant saved them.')
    ).toBeInTheDocument()
  })

  it('refuses an empty name or phone before any request', () => {
    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    const nameInput = screen.getByLabelText('Name')
    const phoneInput = screen.getByLabelText('Phone')
    const saveButton = screen.getByRole('button', { name: 'Save' })

    // Test whitespace-only name
    fireEvent.change(nameInput, { target: { value: '   ' } })
    fireEvent.click(saveButton)

    expect(screen.getByText('Name and phone cannot be empty.')).toBeInTheDocument()
    expect(mockUpdateCustomer).not.toHaveBeenCalled()

    // Test whitespace-only phone
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } })
    fireEvent.change(phoneInput, { target: { value: '' } })
    fireEvent.click(saveButton)

    expect(screen.getByText('Name and phone cannot be empty.')).toBeInTheDocument()
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })

  it('Save sends only those four (trimmed, empty optional as null)', async () => {
    const updatedCustomerResult: SavedCustomerAdminDto = {
      ...sampleCustomer,
      name: 'Maria Trimmed',
      phone: '+306912345679',
      addressLine2: null,
      notes: null,
    }

    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.resolve(updatedCustomerResult),
    })

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Maria Trimmed  ' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '  +306912345679  ' },
    })
    // Clearing optional fields sends them as null
    fireEvent.change(screen.getByLabelText(/Floor or flat/i), {
      target: { value: '   ' },
    })
    fireEvent.change(screen.getByLabelText(/Notes for the rider/i), {
      target: { value: '' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockUpdateCustomer).toHaveBeenCalledTimes(1)
      expect(mockUpdateCustomer).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        id: 'cust-1',
        input: {
          name: 'Maria Trimmed',
          phone: '+306912345679',
          addressLine2: null,
          notes: null,
        },
      })
    })

    expect(mockOnSaved).toHaveBeenCalledWith(updatedCustomerResult)
  })

  it('a 409 shows "Another saved customer of this restaurant has this phone."', async () => {
    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 409 }),
    })

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('Another saved customer of this restaurant has this phone.')
      ).toBeInTheDocument()
    })

    // Dialog stays open: onSaved and onClose were not called
    expect(mockOnSaved).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
    expect(mockOnGone).not.toHaveBeenCalled()
  })

  it('a 422 shows the backend\'s message', async () => {
    const backendMessage = 'This phone number does not look right'
    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 422, message: backendMessage }),
    })

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(backendMessage)).toBeInTheDocument()
    })

    expect(mockOnSaved).not.toHaveBeenCalled()
  })

  it('a 404 closes the dialog and calls onGone with customer id', async () => {
    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 404 }),
    })

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockOnGone).toHaveBeenCalledWith('cust-1')
    })
    expect(mockOnSaved).not.toHaveBeenCalled()
  })

  it('a 500 or error with no statusCode shows "The customer could not be saved. Try again in a moment." and keeps dialog open', async () => {
    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 500 }),
    })

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('The customer could not be saved. Try again in a moment.')
      ).toBeInTheDocument()
    })

    // Dialog stays open
    expect(mockOnSaved).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
    expect(mockOnGone).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Edit Maria Papadopoulou' })).toBeInTheDocument()

    // Also verify rejection with no statusCode
    mockUpdateCustomer.mockReturnValue({
      unwrap: () => Promise.reject(new Error('Unknown server failure')),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('The customer could not be saved. Try again in a moment.')
      ).toBeInTheDocument()
    })
    expect(mockOnSaved).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('disables Save and Cancel buttons while saving', () => {
    mockUseUpdatePartnerCustomerMutation.mockReturnValue([
      mockUpdateCustomer,
      { isLoading: true },
    ])

    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    const saveButton = screen.getByRole('button', { name: /saving…/i })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })

    expect(saveButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('inputs carry maxLength constraints (name 255, phone 40, floor 255, notes 255)', () => {
    render(
      <EditSavedCustomerDialog
        partnerId="partner-1"
        restaurantName="Volos Test Kitchen"
        customer={sampleCustomer}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        onGone={mockOnGone}
      />
    )

    expect(screen.getByLabelText('Name')).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('maxLength', '40')
    expect(screen.getByLabelText(/Floor or flat/i)).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText(/Notes for the rider/i)).toHaveAttribute('maxLength', '255')
  })
})
