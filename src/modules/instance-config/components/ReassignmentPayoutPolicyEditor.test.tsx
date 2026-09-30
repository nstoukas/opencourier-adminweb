import { fireEvent, render, screen } from '@testing-library/react'
import { ReassignmentPayoutPolicyEditor } from './ReassignmentPayoutPolicyEditor'

describe('ReassignmentPayoutPolicyEditor component', () => {
  const initialPolicies = {
    FULL_COMPENSATION: 100,
    HALF_COMPENSATION: 50,
  }
  const defaultPolicy = 'FULL_COMPENSATION'

  it('renders initial policies in inputs with default policy radio checked', () => {
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={jest.fn()}
      />
    )

    // Policy names should appear in text inputs
    expect(screen.getByDisplayValue('FULL_COMPENSATION')).toBeInTheDocument()
    expect(screen.getByDisplayValue('HALF_COMPENSATION')).toBeInTheDocument()

    // Radio inputs exist for default selection
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(2)
    // The first row (FULL_COMPENSATION) should be checked as default
    expect(radios[0]?.checked).toBe(true)
    expect(radios[1]?.checked).toBe(false)
  })

  it('calls onSave with initial policies and default when saved unchanged', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    expect(onSaveMock).toHaveBeenCalledWith(
      { FULL_COMPENSATION: 100, HALF_COMPENSATION: 50 },
      'FULL_COMPENSATION'
    )
  })

  it('calls onSave with updated percentage when percentage input is edited', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    const halfPercentInput = screen.getByDisplayValue('50')
    fireEvent.change(halfPercentInput, { target: { value: '60' } })

    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    expect(onSaveMock).toHaveBeenCalledWith(
      { FULL_COMPENSATION: 100, HALF_COMPENSATION: 60 },
      'FULL_COMPENSATION'
    )
  })

  it('adds an empty row on "Add policy" click and prevents save until name is filled', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /add policy/i }))

    // Save should now be blocked because the new row has an empty policy name
    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Row 3: policy name is required\./i)).toBeInTheDocument()
  })

  it('shows error and blocks onSave when percentage is cleared', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    const fullPercentInput = screen.getByDisplayValue('100')
    fireEvent.change(fullPercentInput, { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Row 1: percentage is required\./i)).toBeInTheDocument()
  })

  it('updates default policy selection when a different radio is selected', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    const radios = screen.getAllByRole('radio')
    // Click the second radio (HALF_COMPENSATION)
    const secondRadio = radios[1]
    expect(secondRadio).toBeDefined()
    if (secondRadio) {
      fireEvent.click(secondRadio)
    }

    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    expect(onSaveMock).toHaveBeenCalledWith(
      { FULL_COMPENSATION: 100, HALF_COMPENSATION: 50 },
      'HALF_COMPENSATION'
    )
  })

  it('re-assigns default policy to remaining row when current default row is removed', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    // Remove the first row (FULL_COMPENSATION), which is currently the default
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    const firstRemoveButton = removeButtons[0]
    expect(firstRemoveButton).toBeDefined()
    if (firstRemoveButton) {
      fireEvent.click(firstRemoveButton)
    }

    // Save should succeed with HALF_COMPENSATION as default
    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    expect(onSaveMock).toHaveBeenCalledWith(
      { HALF_COMPENSATION: 50 },
      'HALF_COMPENSATION'
    )
  })

  it('shows error and blocks onSave when all rows are removed', () => {
    const onSaveMock = jest.fn()
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={onSaveMock}
      />
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    const firstRemoveButton = removeButtons[0]
    expect(firstRemoveButton).toBeDefined()
    if (firstRemoveButton) {
      fireEvent.click(firstRemoveButton)
    }

    const remainingRemoveButtons = screen.getAllByRole('button', { name: /remove/i })
    const nextRemoveButton = remainingRemoveButtons[0]
    expect(nextRemoveButton).toBeDefined()
    if (nextRemoveButton) {
      fireEvent.click(nextRemoveButton)
    }

    fireEvent.click(screen.getByRole('button', { name: /save payout policies/i }))

    expect(onSaveMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Add at least one payout policy/i)).toBeInTheDocument()
  })

  it('disables save button and displays "Saving…" text when isSaving prop is true', () => {
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={true}
        onSave={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /saving…/i })
    expect(saveButton).toBeDisabled()
  })

  it('resynchronizes local form state when policies prop changes', () => {
    const { rerender } = render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={jest.fn()}
      />
    )

    // Make an unsaved edit
    const fullPercentInput = screen.getByDisplayValue('100')
    fireEvent.change(fullPercentInput, { target: { value: '99' } })

    // Rerender with new policies prop from server
    const newPolicies = {
      NEW_CUSTOM_POLICY: 75,
    }
    rerender(
      <ReassignmentPayoutPolicyEditor
        policies={newPolicies}
        defaultPolicy="NEW_CUSTOM_POLICY"
        isSaving={false}
        onSave={jest.fn()}
      />
    )

    // Unsaved edits discarded; new policy name and value displayed
    expect(screen.queryByDisplayValue('FULL_COMPENSATION')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('NEW_CUSTOM_POLICY')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75')).toBeInTheDocument()
  })

  it('renders explanatory notes including non-retroactive policy sentence', () => {
    render(
      <ReassignmentPayoutPolicyEditor
        policies={initialPolicies}
        defaultPolicy={defaultPolicy}
        isSaving={false}
        onSave={jest.fn()}
      />
    )

    expect(
      screen.getByText(/How much of a dropped rider's piece-rate they keep/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Renaming or removing a policy does not change past reassignments/i)
    ).toBeInTheDocument()
  })
})
