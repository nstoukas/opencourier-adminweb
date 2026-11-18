import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RotateCredentialsDialog } from './RotateCredentialsDialog'
import { useRotatePartnerPasswordMutation } from '../../../api/partnersApi'

jest.mock('../../../api/partnersApi', () => ({
  useRotatePartnerPasswordMutation: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockRotatePasswordMutation = jest.fn()
const mockReset = jest.fn()
const mockUseRotatePartnerPasswordMutation = useRotatePartnerPasswordMutation as jest.Mock

describe('RotateCredentialsDialog component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRotatePartnerPasswordMutation.mockReturnValue([
      mockRotatePasswordMutation,
      { isLoading: false, reset: mockReset },
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

    const submitBtn = screen.getByRole('button', { name: /^set new password$/i })
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

  it('with apiKey: null toasts and closes the dialog (spec 0037, AC-1, AC-13)', async () => {
    mockRotatePasswordMutation.mockReturnValue({
      unwrap: () => Promise.resolve({ apiKey: null }),
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

    fireEvent.click(screen.getByRole('button', { name: /^set new password$/i }))

    await waitFor(() => {
      expect(mockRotatePasswordMutation).toHaveBeenCalledTimes(1)
      expect(mockRotatePasswordMutation).toHaveBeenCalledWith({
        id: 'p1',
        password: 'newpassword123',
      })
      expect(mockReset).toHaveBeenCalledTimes(1)
      expect(mockToast).toHaveBeenCalledWith({ title: 'Password updated for Souvlaki tou Nikou.' })
      expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    })
    expect(screen.queryByText(/password set for souvlaki tou nikou/i)).toBeNull()
  })

  it('with apiKey present shows the key panel, resets mutation, does not toast or close (spec 0037, AC-1, AC-13)', async () => {
    mockRotatePasswordMutation.mockReturnValue({
      unwrap: () => Promise.resolve({ apiKey: 'ock_rotated_secret_key_789' }),
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

    fireEvent.click(screen.getByRole('button', { name: /^set new password$/i }))

    await waitFor(() => {
      expect(mockRotatePasswordMutation).toHaveBeenCalledTimes(1)
      expect(mockReset).toHaveBeenCalledTimes(1)
      // AC-13: Does NOT toast and does NOT close
      expect(mockToast).not.toHaveBeenCalled()
      expect(onOpenChangeMock).not.toHaveBeenCalled()
    })

    // Shows "Password set for <name>" title and description
    expect(screen.getByRole('heading', { name: 'Password set for Souvlaki tou Nikou' })).toBeInTheDocument()
    expect(
      screen.getByText(/this restaurant also had an api key: it was replaced too, so the old key stopped working/i)
    ).toBeInTheDocument()

    // Key is shown in read-only input
    const keyInput = screen.getByRole('textbox', { name: 'New API key' }) as HTMLInputElement
    expect(keyInput.value).toBe('ock_rotated_secret_key_789')
    expect(keyInput).toHaveAttribute('readOnly')

    // Escape does not close the dialog while the key panel is shown
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
    expect(onOpenChangeMock).not.toHaveBeenCalled()

    // Clicking Done closes the dialog
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onOpenChangeMock).toHaveBeenCalledWith(false)
  })

  it('is titled "Set New Password for <name>" (spec 0024, AC-2)', () => {
    render(
      <RotateCredentialsDialog
        open={true}
        onOpenChange={jest.fn()}
        partnerId="p1"
        partnerName="Souvlaki tou Nikou"
      />
    )

    expect(screen.getByRole('heading', { name: 'Set New Password for Souvlaki tou Nikou' })).toBeInTheDocument()
  })

  it('names its submit button "Set New Password", like its title (row 91 review)', () => {
    render(
      <RotateCredentialsDialog
        open={true}
        onOpenChange={jest.fn()}
        partnerId="p1"
        partnerName="Souvlaki tou Nikou"
      />
    )

    expect(screen.getByRole('button', { name: 'Set New Password' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rotate password/i })).toBeNull()
  })

  it('gives focus back to the returnFocusTo button after it closes (row 91 review)', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(true)
      const buttonRef = React.useRef<HTMLButtonElement>(null)
      return (
        <div>
          <button ref={buttonRef} type="button">
            Open password dialog
          </button>
          <RotateCredentialsDialog
            open={open}
            onOpenChange={setOpen}
            partnerId="p1"
            partnerName="Souvlaki tou Nikou"
            returnFocusTo={buttonRef}
          />
        </div>
      )
    }

    render(<Harness />)
    const openButton = screen.getByRole('button', { name: 'Open password dialog', hidden: true })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(openButton)
    })
  })
})
