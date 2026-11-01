import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RotateCourierPasswordDialog } from './RotateCourierPasswordDialog'

const mockRotateCourierPassword = jest.fn()
const mockUseRotateCourierPasswordMutation = jest.fn()
const mockToast = jest.fn()

jest.mock('../../api/couriersApi', () => ({
  useRotateCourierPasswordMutation: () => mockUseRotateCourierPasswordMutation(),
}))

jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

describe('RotateCourierPasswordDialog component (spec 0013, AC-4 to AC-6)', () => {
  const returnFocusTo = { current: document.createElement('button') }
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRotateCourierPasswordMutation.mockReturnValue([
      mockRotateCourierPassword,
      { isLoading: false },
    ])
  })

  it('Change password dialog says rider is signed out on phone and set Offline (AC-6)', () => {
    render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Nikos"
        carryingDelivery={false}
        returnFocusTo={returnFocusTo}
      />
    )

    expect(screen.getByText(/Nikos is signed out of the app on their phone and set Offline/i)).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('with carryingDelivery true, shows carrying warning naming first name; with false it does not (AC-6)', () => {
    const { rerender } = render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Panos"
        carryingDelivery={true}
        returnFocusTo={returnFocusTo}
      />
    )

    // With carryingDelivery true
    const warning = screen.getByRole('note')
    expect(warning).toHaveTextContent(
      'Panos is carrying a delivery. Steps still waiting on their phone are sent only when they log in again on that phone. If the phone is lost, reassign the delivery.'
    )

    // Re-render with carryingDelivery false
    rerender(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Panos"
        carryingDelivery={false}
        returnFocusTo={returnFocusTo}
      />
    )

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('submit is never blocked by carrying (AC-6)', () => {
    render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Panos"
        carryingDelivery={true}
        returnFocusTo={returnFocusTo}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /set new password/i })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: 'brandNewPassword123' } })
    fireEvent.change(screen.getByLabelText(/^New password again$/i), { target: { value: 'brandNewPassword123' } })

    // Valid password pair enables submit even though carryingDelivery is true
    expect(submitBtn).toBeEnabled()
  })

  it('successful rotation calls mutation with { id, password }, toasts and closes (AC-4, AC-6)', async () => {
    mockRotateCourierPassword.mockReturnValue({
      unwrap: () => Promise.resolve(),
    })

    render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Nikos"
        carryingDelivery={false}
        returnFocusTo={returnFocusTo}
      />
    )

    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: 'updatedSecretPassword!' } })
    fireEvent.change(screen.getByLabelText(/^New password again$/i), { target: { value: 'updatedSecretPassword!' } })

    const submitBtn = screen.getByRole('button', { name: /set new password/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRotateCourierPassword).toHaveBeenCalledTimes(1)
    })

    expect(mockRotateCourierPassword).toHaveBeenCalledWith({
      id: 'courier-123',
      password: 'updatedSecretPassword!',
    })

    expect(mockToast).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'New password set for Nikos. Their phone is signed out.',
    })

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('failure shows the backend message and does not close (AC-6)', async () => {
    mockRotateCourierPassword.mockReturnValue({
      unwrap: () => Promise.reject({ message: 'This rider has no login.' }),
    })

    render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName="Nikos"
        carryingDelivery={false}
        returnFocusTo={returnFocusTo}
      />
    )

    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: 'newValidSecretPassword!' } })
    fireEvent.change(screen.getByLabelText(/^New password again$/i), { target: { value: 'newValidSecretPassword!' } })

    fireEvent.click(screen.getByRole('button', { name: /set new password/i }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('This rider has no login.')
    })

    expect(mockToast).not.toHaveBeenCalled()
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('falls back to "this rider" / "This rider" when firstName is empty', () => {
    render(
      <RotateCourierPasswordDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        courierId="courier-123"
        firstName=""
        carryingDelivery={true}
        returnFocusTo={returnFocusTo}
      />
    )

    expect(screen.getByText(/This rider is signed out of the app on their phone and set Offline/i)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'This rider is carrying a delivery. Steps still waiting on their phone are sent only when they log in again on that phone. If the phone is lost, reassign the delivery.'
    )
  })
})
