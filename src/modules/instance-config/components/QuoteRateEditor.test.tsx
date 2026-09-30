import { fireEvent, render, screen } from '@testing-library/react'
import { QuoteRateEditor } from './QuoteRateEditor'

describe('QuoteRateEditor component', () => {
  // Common default props used across tests for easy overrides
  const defaultProps = {
    rateText: '150',
    rate: 150,
    currencyCode: 'EUR',
    distanceUnit: 'KILOMETERS',
    error: '',
    isSaving: false,
    onChange: jest.fn(),
    onSave: jest.fn(),
  }

  it('renders the current rate in the input field', () => {
    // Render the component with an initial rateText of "150"
    render(<QuoteRateEditor {...defaultProps} rateText="150" />)

    // The number input should contain "150" as its display value
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('renders the human-readable description for rate, currency, and distance unit', () => {
    // 150 cents EUR per kilometre should render as €1.50 per kilometre (no USD $)
    render(
      <QuoteRateEditor
        {...defaultProps}
        rate={150}
        currencyCode="EUR"
        distanceUnit="KILOMETERS"
      />
    )

    const description = screen.getByText(/1\.50/i)
    expect(description).toBeInTheDocument()
    // Verify euro formatting is used and dollar sign is absent
    expect(description.textContent).toContain('kilometre')
    expect(description.textContent).not.toContain('$')
  })

  it('calls onSave once when clicking the Save button with a valid rate', () => {
    const onSaveMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="150" onSave={onSaveMock} />)

    // Click the "Save quote rate" button
    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    fireEvent.click(saveButton)

    // Verify onSave callback was triggered exactly once
    expect(onSaveMock).toHaveBeenCalledTimes(1)
  })

  it('disables Save button and ignores clicks when rate input is empty', () => {
    const onSaveMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="" onSave={onSaveMock} />)

    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    // Empty rateText is invalid, button should be disabled
    expect(saveButton).toBeDisabled()

    fireEvent.click(saveButton)
    expect(onSaveMock).not.toHaveBeenCalled()
  })

  it('disables Save button when rateText is a non-integer (decimal)', () => {
    const onSaveMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="1.5" onSave={onSaveMock} />)

    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    // Decimal rateText (1.5) is invalid (rate must be integer cents)
    expect(saveButton).toBeDisabled()

    fireEvent.click(saveButton)
    expect(onSaveMock).not.toHaveBeenCalled()
  })

  it('disables Save button when rateText is a negative number', () => {
    const onSaveMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="-1" onSave={onSaveMock} />)

    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    // Negative rateText is invalid
    expect(saveButton).toBeDisabled()

    fireEvent.click(saveButton)
    expect(onSaveMock).not.toHaveBeenCalled()
  })

  it('enables Save button when rateText is zero', () => {
    const onSaveMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="0" onSave={onSaveMock} />)

    // Zero is a legal quote rate (meaning no distance fee component)
    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    expect(saveButton).toBeEnabled()

    fireEvent.click(saveButton)
    expect(onSaveMock).toHaveBeenCalledTimes(1)
  })

  it('disables Save button and shows "Saving…" text when isSaving is true', () => {
    render(<QuoteRateEditor {...defaultProps} rateText="150" isSaving={true} />)

    // Button should show "Saving…" label variant and be disabled during saving mutation
    const saveButton = screen.getByRole('button', { name: /saving…/i })
    expect(saveButton).toBeInTheDocument()
    expect(saveButton).toBeDisabled()
  })

  it('passes raw typed string to onChange callback on input change', () => {
    const onChangeMock = jest.fn()
    render(<QuoteRateEditor {...defaultProps} rateText="150" onChange={onChangeMock} />)

    const input = screen.getByDisplayValue('150')
    // Type a new numeric value string into the input. Note: HTML5 <input type="number"> in JSDOM
    // sanitizes non-numeric strings to "", so a numeric string is used to verify raw value forwarding.
    fireEvent.change(input, { target: { value: '200' } })

    // Raw string value should be forwarded to onChange handler without component-level pre-filtering
    expect(onChangeMock).toHaveBeenCalledWith('200')
  })

  it('displays validation error message when error prop is provided', () => {
    const errorMessage = 'Enter a whole number of cents, zero or more.'
    render(<QuoteRateEditor {...defaultProps} error={errorMessage} />)

    // Verify error text is rendered in the document
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('enables Save button independently using only its own props without external page state', () => {
    // Pass only the component's required props with a valid rateText
    render(
      <QuoteRateEditor
        rateText="150"
        rate={150}
        currencyCode="EUR"
        distanceUnit="KILOMETERS"
        error=""
        isSaving={false}
        onChange={jest.fn()}
        onSave={jest.fn()}
      />
    )

    // The Save button relies only on parseQuoteRateInput(rateText) and isSaving, not on any parent page state
    const saveButton = screen.getByRole('button', { name: /save quote rate/i })
    expect(saveButton).toBeEnabled()
  })
})
