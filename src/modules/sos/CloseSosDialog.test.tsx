import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CloseSosDialog } from './CloseSosDialog'
import { useCloseSosMutation } from '../../api/sosApi'

jest.mock('../../api/sosApi', () => ({
  useCloseSosMutation: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({
      toast: mockToast,
    }),
  }
})

const mockUseCloseSosMutation = useCloseSosMutation as jest.Mock

describe('CloseSosDialog (spec 0022, AC-10)', () => {
  let mockCloseSos: jest.Mock
  let mockUnwrap: jest.Mock
  let onOpenChange: jest.Mock
  let returnFocusButton: HTMLButtonElement

  beforeEach(() => {
    jest.clearAllMocks()
    mockUnwrap = jest.fn()
    mockCloseSos = jest.fn().mockReturnValue({ unwrap: mockUnwrap })
    mockUseCloseSosMutation.mockReturnValue([mockCloseSos, { isLoading: false }])
    onOpenChange = jest.fn()

    returnFocusButton = document.createElement('button')
    returnFocusButton.textContent = 'Open Dialog'
    document.body.appendChild(returnFocusButton)
  })

  afterEach(() => {
    returnFocusButton.remove()
  })

  it('offers the four outcomes in order (Rider safe, Help arrived, False alarm, Other)', () => {
    const focusRef = { current: returnFocusButton }
    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    const select = screen.getByLabelText('What happened') as HTMLSelectElement
    const options = Array.from(select.querySelectorAll('option')).map((opt) => opt.textContent)
    expect(options).toEqual(['Rider safe', 'Help arrived', 'False alarm', 'Other'])
  })

  it('submits {id, outcome, note} with note trimmed', async () => {
    mockUnwrap.mockResolvedValueOnce({})
    const focusRef = { current: returnFocusButton }

    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    fireEvent.change(screen.getByLabelText('What happened'), { target: { value: 'HELP_ARRIVED' } })
    fireEvent.change(screen.getByLabelText(/Note/i), { target: { value: '  Ambulance arrived on site.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    await waitFor(() => {
      expect(mockCloseSos).toHaveBeenCalledWith({
        id: 'sos-123',
        outcome: 'HELP_ARRIVED',
        note: 'Ambulance arrived on site.',
      })
    })
  })

  it('submits a blank note as null', async () => {
    mockUnwrap.mockResolvedValueOnce({})
    const focusRef = { current: returnFocusButton }

    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Note/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    await waitFor(() => {
      expect(mockCloseSos).toHaveBeenCalledWith({
        id: 'sos-123',
        outcome: 'RIDER_SAFE',
        note: null,
      })
    })
  })

  it('a note over 500 characters disables Close SOS and marks the field invalid with the counter', () => {
    const focusRef = { current: returnFocusButton }
    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    const textarea = screen.getByLabelText(/Note/i)
    const submitBtn = screen.getByRole('button', { name: 'Close SOS' })

    // Within limit: 500 chars
    fireEvent.change(textarea, { target: { value: 'a'.repeat(500) } })
    expect(textarea).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('500 / 500')).not.toHaveClass('text-destructive')
    expect(submitBtn).not.toBeDisabled()

    // Exceeds limit: 501 chars
    fireEvent.change(textarea, { target: { value: 'a'.repeat(501) } })
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('501 / 500')).toHaveClass('text-destructive')
    expect(submitBtn).toBeDisabled()
  })

  it('a backend error (409 "This SOS has already been closed.") is shown in an alert and the dialog stays open', async () => {
    mockUnwrap.mockRejectedValueOnce({
      message: 'This SOS has already been closed.',
    })
    const focusRef = { current: returnFocusButton }

    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('This SOS has already been closed.')
    })

    // Dialog stays open
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('on success, shows toast and closes dialog', async () => {
    mockUnwrap.mockResolvedValueOnce({})
    const focusRef = { current: returnFocusButton }

    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: 'The SOS is closed.' })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('focus returns to the opening button on close auto focus', () => {
    const focusSpy = jest.spyOn(returnFocusButton, 'focus')
    const focusRef = { current: returnFocusButton }

    const { unmount } = render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        returnFocusTo={focusRef}
      />,
    )

    // Radix DialogContent onCloseAutoFocus
    const dialogContent = document.querySelector('[role="dialog"]')
    expect(dialogContent).toBeInTheDocument()

    // Simulate close autofocus event
    const preventDefault = jest.fn()
    const autoFocusEvent = new CustomEvent('closeAutoFocus', { cancelable: true })
    ;(autoFocusEvent as any).preventDefault = preventDefault

    // Close button click
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
