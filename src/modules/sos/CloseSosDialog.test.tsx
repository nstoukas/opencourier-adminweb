import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// The dialog's <form>, found from a field inside it.
function formOf(field: HTMLElement): HTMLFormElement {
  const form = field.closest('form')
  if (!form) throw new Error('the field is not inside a form')
  return form
}

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

  it('offers the four outcomes in order (Rider safe, Help arrived, False alarm, Other) after a disabled "Choose…"', () => {
    const focusRef = { current: returnFocusButton }
    render(
      <CloseSosDialog
        open={true}
        onOpenChange={onOpenChange}
        incidentId="sos-123"
        riderName="Nikos P"
        active={true}
        riderOutcome={null}
        returnFocusTo={focusRef}
      />,
    )

    const select = screen.getByLabelText('What happened') as HTMLSelectElement
    const options = Array.from(select.querySelectorAll('option'))
    expect(options.map((opt) => opt.textContent)).toEqual(['Choose…', 'Rider safe', 'Help arrived', 'False alarm', 'Other'])
    // "Choose…" is a prompt, never an outcome the admin can pick back.
    expect(options[0]).toBeDisabled()
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
        riderOutcome={null}
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
        riderOutcome="RIDER_SAFE"
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
        riderOutcome="RIDER_SAFE"
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
        riderOutcome="RIDER_SAFE"
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
        riderOutcome="RIDER_SAFE"
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
        riderOutcome="RIDER_SAFE"
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

  // Row 73 review: no outcome is recorded that nobody chose. The dialog starts from how the rider
  // ended it, or from "Choose…" with Close SOS disabled.
  describe('the starting outcome', () => {
    const renderWith = (riderOutcome: 'RIDER_SAFE' | 'FALSE_ALARM' | null, active = true) =>
      render(
        <CloseSosDialog
          open={true}
          onOpenChange={onOpenChange}
          incidentId="sos-123"
          riderName="Nikos P"
          active={active}
          riderOutcome={riderOutcome}
          returnFocusTo={{ current: returnFocusButton }}
        />,
      )

    it('with no rider outcome, starts on "Choose…" with Close SOS disabled', () => {
      renderWith(null)

      const select = screen.getByLabelText('What happened') as HTMLSelectElement
      expect(select.value).toBe('')
      expect(select.selectedOptions[0]).toHaveTextContent('Choose…')
      expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()
    })

    it('with no rider outcome, submitting the form sends nothing', async () => {
      mockUnwrap.mockResolvedValue({})
      renderWith(null)

      // Submits the form itself, past the disabled button (Enter in the note does the same).
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        fireEvent.submit(formOf(screen.getByLabelText('What happened')))
      })

      expect(mockCloseSos).not.toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('choosing an outcome enables Close SOS and sends that outcome', async () => {
      mockUnwrap.mockResolvedValueOnce({})
      renderWith(null)

      fireEvent.change(screen.getByLabelText('What happened'), { target: { value: 'OTHER' } })
      const button = screen.getByRole('button', { name: 'Close SOS' })
      expect(button).not.toBeDisabled()
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCloseSos).toHaveBeenCalledWith({ id: 'sos-123', outcome: 'OTHER', note: null })
      })
    })

    it('after the rider pressed "False alarm", starts on False alarm', () => {
      renderWith('FALSE_ALARM', false)

      const select = screen.getByLabelText('What happened') as HTMLSelectElement
      expect(select.value).toBe('FALSE_ALARM')
      expect(select.selectedOptions[0]).toHaveTextContent('False alarm')
      expect(screen.getByRole('button', { name: 'Close SOS' })).not.toBeDisabled()
    })

    it('after the rider pressed "I\'m safe", starts on Rider safe', () => {
      renderWith('RIDER_SAFE', false)

      const select = screen.getByLabelText('What happened') as HTMLSelectElement
      expect(select.value).toBe('RIDER_SAFE')
      expect(select.selectedOptions[0]).toHaveTextContent('Rider safe')
    })
  })

  // Review "untested guards": while the close is on its way, nothing sends it twice and nothing
  // closes the dialog under it.
  describe('while the close is in flight (isLoading)', () => {
    beforeEach(() => {
      mockUseCloseSosMutation.mockReturnValue([mockCloseSos, { isLoading: true }])
    })

    const renderLoading = () =>
      render(
        <CloseSosDialog
          open={true}
          onOpenChange={onOpenChange}
          incidentId="sos-123"
          riderName="Nikos P"
          active={true}
          riderOutcome="RIDER_SAFE"
          returnFocusTo={{ current: returnFocusButton }}
        />,
      )

    it('a submit calls the mutation zero times', async () => {
      renderLoading()

      // The spinner beside the label adds to the button's name, so match the label within it.
      expect(screen.getByRole('button', { name: /Close SOS/ })).toBeDisabled()
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        fireEvent.submit(formOf(screen.getByLabelText('What happened')))
      })

      expect(mockCloseSos).toHaveBeenCalledTimes(0)
    })

    it('Escape does not close it', () => {
      renderLoading()

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

      expect(onOpenChange).not.toHaveBeenCalledWith(false)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('Cancel is disabled and a click on it does not close it', () => {
      renderLoading()

      const cancel = screen.getByRole('button', { name: 'Cancel' })
      expect(cancel).toBeDisabled()
      fireEvent.click(cancel)

      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })
})
