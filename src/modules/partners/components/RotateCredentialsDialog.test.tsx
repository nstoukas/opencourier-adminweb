import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RotateCredentialsDialog } from './RotateCredentialsDialog'
import { useRotatePartnerPasswordMutation } from '../../../api/partnersApi'

jest.mock('../../../api/partnersApi', () => ({
  useRotatePartnerPasswordMutation: jest.fn(),
}))

const mockRotatePasswordMutation = jest.fn()
const mockUseRotatePartnerPasswordMutation = useRotatePartnerPasswordMutation as jest.Mock

describe('RotateCredentialsDialog component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRotatePartnerPasswordMutation.mockReturnValue([
      mockRotatePasswordMutation,
      { isLoading: false },
    ])
  })

  it('keeps submit button disabled until passwords match and are at least 8 characters', () => {
    render(
      <RotateCredentialsDialog
        open={true}
        onOpenChange={jest.fn()}
        partnerId="p1"
        partnerName="Souvlaki tou Nikou"
      />
    )

    const submitBtn = screen.getByRole('button', { name: /rotate password/i })
    expect(submitBtn).toBeDisabled()

    const newPwInput = screen.getByLabelText('New password')
    const confirmPwInput = screen.getByLabelText('Confirm new password')

    // Fill <8 chars
    fireEvent.change(newPwInput, { target: { value: 'short' } })
    fireEvent.change(confirmPwInput, { target: { value: 'short' } })
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()

    // Fill mismatch
    fireEvent.change(newPwInput, { target: { value: 'newpassword123' } })
    fireEvent.change(confirmPwInput, { target: { value: 'different123' } })
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()

    // Fill matching valid password
    fireEvent.change(confirmPwInput, { target: { value: 'newpassword123' } })
    expect(submitBtn).not.toBeDisabled()
  })

  it('submits mutation with partner ID and new password on valid submit', async () => {
    mockRotatePasswordMutation.mockReturnValue({
      unwrap: () => Promise.resolve(),
    })
    const onOpenChangeMock = jest.fn()

    render(
      <RotateCredentialsDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        partnerId="p1"
        partnerName="Souvlaki tou Nikou"
      />
    )

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'newpassword123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /rotate password/i }))

    await waitFor(() => {
      expect(mockRotatePasswordMutation).toHaveBeenCalledTimes(1)
      expect(mockRotatePasswordMutation).toHaveBeenCalledWith({
        id: 'p1',
        password: 'newpassword123',
      })
      expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    })
  })
})
