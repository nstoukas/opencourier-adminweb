import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddCourierDialog } from './AddCourierDialog'
import type { CourierAdminDto } from '../../backend-admin-sdk'

const mockCreateCourier = jest.fn()
const mockUseCreateCourierMutation = jest.fn()

jest.mock('../../api/couriersApi', () => ({
  useCreateCourierMutation: () => mockUseCreateCourierMutation(),
}))

describe('AddCourierDialog component (spec 0013, AC-1 to AC-3)', () => {
  const returnFocusTo = { current: document.createElement('button') }
  const mockOnOpenChange = jest.fn()
  const mockOnOpenCourier = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreateCourierMutation.mockReturnValue([
      mockCreateCourier,
      { isLoading: false },
    ])
  })

  it('Create courier stays disabled until both names, a valid phone, a valid email and two equal valid passwords are entered (AC-3 client side)', () => {
    render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /create courier/i })
    expect(submitBtn).toBeDisabled()

    const firstNameInput = screen.getByLabelText(/^First name/i)
    const lastNameInput = screen.getByLabelText(/^Last name/i)
    const phoneInput = screen.getByLabelText(/^Phone/i)
    const emailInput = screen.getByLabelText(/^Email/i)
    const passwordInput = screen.getByLabelText(/^Password$/i)
    const confirmInput = screen.getByLabelText(/^Password again$/i)

    // Name only
    fireEvent.change(firstNameInput, { target: { value: 'Kostas' } })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(lastNameInput, { target: { value: 'Oikonomou' } })
    expect(submitBtn).toBeDisabled()

    // Invalid phone without plus
    fireEvent.change(phoneInput, { target: { value: '6900000000' } })
    expect(submitBtn).toBeDisabled()
    expect(screen.getByText(/A plus and 8 to 15 digits/i)).toBeInTheDocument()

    // Valid phone with spaces
    fireEvent.change(phoneInput, { target: { value: '+30 690 000 0000' } })
    expect(submitBtn).toBeDisabled()

    // Invalid email
    fireEvent.change(emailInput, { target: { value: 'notanemail' } })
    expect(submitBtn).toBeDisabled()
    expect(screen.getByText(/Not a valid email address/i)).toBeInTheDocument()

    // Valid email
    fireEvent.change(emailInput, { target: { value: 'kostas@example.com' } })
    expect(submitBtn).toBeDisabled()

    // Password too short (<8)
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.change(confirmInput, { target: { value: 'short' } })
    expect(submitBtn).toBeDisabled()
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument()

    // Password mismatch
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } })
    fireEvent.change(confirmInput, { target: { value: 'different123' } })
    expect(submitBtn).toBeDisabled()
    expect(screen.getByText(/The two passwords do not match/i)).toBeInTheDocument()

    // Matching valid passwords (8 to 72 chars)
    fireEvent.change(confirmInput, { target: { value: 'securePass123' } })
    expect(submitBtn).toBeEnabled()
  })

  it('submits request with trimmed names, spaces removed from phone, and trimmed lower cased email (AC-3)', async () => {
    const createdCourierDto: CourierAdminDto = {
      id: 'courier-new-1',
      firstName: 'Kostas',
      lastName: 'Oikonomou',
      phoneNumber: '+306901234567',
      status: 'OFFLINE' as any,
      deliverySetting: 'MANUAL' as any,
      createdAt: new Date(),
    } as any

    mockCreateCourier.mockReturnValue({
      unwrap: () => Promise.resolve(createdCourierDto),
    })

    render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    fireEvent.change(screen.getByLabelText(/^First name/i), { target: { value: '   Kostas   ' } })
    fireEvent.change(screen.getByLabelText(/^Last name/i), { target: { value: '   Oikonomou   ' } })
    fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+30 690 123 4567' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: '  Kostas.Rider@Example.COM  ' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'MySecretPassword123' } })
    fireEvent.change(screen.getByLabelText(/^Password again$/i), { target: { value: 'MySecretPassword123' } })

    const submitBtn = screen.getByRole('button', { name: /create courier/i })
    expect(submitBtn).toBeEnabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateCourier).toHaveBeenCalledTimes(1)
    })

    expect(mockCreateCourier).toHaveBeenCalledWith({
      firstName: 'Kostas',
      lastName: 'Oikonomou',
      phoneNumber: '+306901234567',
      email: 'kostas.rider@example.com',
      password: 'MySecretPassword123',
    })
  })

  it('AC-2: after successful create, shows email (lower cased) and typed password, "Copy them now: the password cannot be shown again", and "Open <name>" button calling navigator with new id', async () => {
    // Response has NO password (or a server-side hash), ensuring password is taken from the form
    const createdCourierDto: CourierAdminDto = {
      id: 'courier-new-99',
      firstName: 'Panos',
      lastName: 'Giannopoulos',
      phoneNumber: '+306909876543',
      status: 'OFFLINE' as any,
      deliverySetting: 'MANUAL' as any,
      createdAt: new Date(),
    } as any

    mockCreateCourier.mockReturnValue({
      unwrap: () => Promise.resolve(createdCourierDto),
    })

    render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    fireEvent.change(screen.getByLabelText(/^First name/i), { target: { value: 'Panos' } })
    fireEvent.change(screen.getByLabelText(/^Last name/i), { target: { value: 'Giannopoulos' } })
    fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+30 690 987 6543' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'Panos.G@Example.COM' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'formTypedPassword!456' } })
    fireEvent.change(screen.getByLabelText(/^Password again$/i), { target: { value: 'formTypedPassword!456' } })

    fireEvent.click(screen.getByRole('button', { name: /create courier/i }))

    await waitFor(() => {
      expect(screen.getByText('Panos Giannopoulos can log in')).toBeInTheDocument()
    })

    // Shown once notice text
    expect(screen.getByText('Copy them now: the password cannot be shown again.')).toBeInTheDocument()

    // Displays lower cased email and typed form password
    expect(screen.getByText('panos.g@example.com')).toBeInTheDocument()
    expect(screen.getByText('formTypedPassword!456')).toBeInTheDocument()

    // "Open Panos Giannopoulos" button calls onOpenCourier with new id
    const openBtn = screen.getByRole('button', { name: 'Open Panos Giannopoulos' })
    fireEvent.click(openBtn)
    expect(mockOnOpenCourier).toHaveBeenCalledTimes(1)
    expect(mockOnOpenCourier).toHaveBeenCalledWith('courier-new-99')

    // "Done" button closes dialog
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(doneBtn)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('reopening the dialog clears the notice and the fields', async () => {
    const createdCourierDto: CourierAdminDto = {
      id: 'courier-new-5',
      firstName: 'Eleni',
      lastName: 'K.',
      phoneNumber: '+306911112222',
      status: 'OFFLINE' as any,
      deliverySetting: 'MANUAL' as any,
      createdAt: new Date(),
    } as any

    mockCreateCourier.mockReturnValue({
      unwrap: () => Promise.resolve(createdCourierDto),
    })

    const { rerender } = render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    fireEvent.change(screen.getByLabelText(/^First name/i), { target: { value: 'Eleni' } })
    fireEvent.change(screen.getByLabelText(/^Last name/i), { target: { value: 'K.' } })
    fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+30 691 111 2222' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'eleni@volos.coop' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'eleniPass123' } })
    fireEvent.change(screen.getByLabelText(/^Password again$/i), { target: { value: 'eleniPass123' } })

    fireEvent.click(screen.getByRole('button', { name: /create courier/i }))

    await waitFor(() => {
      expect(screen.getByText('Eleni K. can log in')).toBeInTheDocument()
    })

    // Dialog closes
    rerender(
      <AddCourierDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    // Dialog reopens
    rerender(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    // Notice is cleared; form inputs are empty
    expect(screen.queryByText('Eleni K. can log in')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create courier/i })).toBeDisabled()
    expect(screen.getByLabelText(/^First name/i)).toHaveValue('')
    expect(screen.getByLabelText(/^Last name/i)).toHaveValue('')
    expect(screen.getByLabelText(/^Phone/i)).toHaveValue('')
    expect(screen.getByLabelText(/^Email/i)).toHaveValue('')
    expect(screen.getByLabelText(/^Password$/i)).toHaveValue('')
    expect(screen.getByLabelText(/^Password again$/i)).toHaveValue('')
  })

  it('submit button is disabled while the request runs (isLoading: true)', () => {
    mockUseCreateCourierMutation.mockReturnValue([
      mockCreateCourier,
      { isLoading: true },
    ])

    render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    fireEvent.change(screen.getByLabelText(/^First name/i), { target: { value: 'Kostas' } })
    fireEvent.change(screen.getByLabelText(/^Last name/i), { target: { value: 'Oikonomou' } })
    fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+30 690 000 0000' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'kostas@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'securePass123' } })
    fireEvent.change(screen.getByLabelText(/^Password again$/i), { target: { value: 'securePass123' } })

    const submitBtn = screen.getByRole('button', { name: /create courier/i })
    expect(submitBtn).toBeDisabled()
  })

  it('AC-3 server refusal: rejected create shows backend message and keeps the form', async () => {
    mockCreateCourier.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          message: 'That phone is already used by another rider.',
        }),
    })

    render(
      <AddCourierDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        returnFocusTo={returnFocusTo}
        onOpenCourier={mockOnOpenCourier}
      />
    )

    fireEvent.change(screen.getByLabelText(/^First name/i), { target: { value: 'Kostas' } })
    fireEvent.change(screen.getByLabelText(/^Last name/i), { target: { value: 'Oikonomou' } })
    fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+30 690 000 0000' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'kostas@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'securePass123' } })
    fireEvent.change(screen.getByLabelText(/^Password again$/i), { target: { value: 'securePass123' } })

    fireEvent.click(screen.getByRole('button', { name: /create courier/i }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('That phone is already used by another rider.')
    })

    // Form fields are still kept intact
    expect(screen.getByLabelText(/^First name/i)).toHaveValue('Kostas')
    expect(screen.getByLabelText(/^Phone/i)).toHaveValue('+30 690 000 0000')
    expect(screen.queryByText(/can log in/i)).not.toBeInTheDocument()
  })
})
