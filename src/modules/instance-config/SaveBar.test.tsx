import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveBar } from './SaveBar'
import type { PendingChange } from './settingsDiff'

describe('SaveBar component (spec 0010, AC-3, AC-4, AC-14)', () => {
  const dummyChanges: PendingChange[] = [
    { key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' },
    { key: 'maxAssignmentDistance', label: 'Furthest courier to offer', from: '20', to: '15' },
  ]

  it('renders nothing when there are no changes', () => {
    const { container } = render(
      <SaveBar
        changes={[]}
        blockers={[]}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders "1 unsaved change:" for a single change', () => {
    const singleChange: PendingChange[] = [
      { key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' },
    ]
    render(
      <SaveBar
        changes={singleChange}
        blockers={[]}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(screen.getByText('1 unsaved change:')).toBeInTheDocument()
    expect(screen.getByText('Base fee')).toBeInTheDocument()
    expect(screen.getByText(/€2\.00/)).toBeInTheDocument()
    expect(screen.getByText(/€2\.50/)).toBeInTheDocument()
  })

  it('renders "N unsaved changes:" and each "Label old → new"', () => {
    render(
      <SaveBar
        changes={dummyChanges}
        blockers={[]}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(screen.getByText('2 unsaved changes:')).toBeInTheDocument()
    expect(screen.getByText('Base fee')).toBeInTheDocument()
    expect(screen.getByText('Furthest courier to offer')).toBeInTheDocument()
  })

  it('renders region change as "Service area redrawn"', () => {
    const regionChange: PendingChange[] = [
      { key: 'region', label: 'Service area', from: '', to: '' },
    ]
    render(
      <SaveBar
        changes={regionChange}
        blockers={[]}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )
    expect(screen.getByText('Service area')).toBeInTheDocument()
    expect(screen.getByText(/redrawn/)).toBeInTheDocument()
  })

  it('disables Save button and references save-all-blockers via aria-describedby when blockers exist', () => {
    const blockersList = ['Base fee is empty', 'URL is not a valid URL']
    render(
      <SaveBar
        changes={dummyChanges}
        blockers={blockersList}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveAttribute('aria-describedby', 'save-all-blockers')

    const blockersContainer = document.getElementById('save-all-blockers')
    expect(blockersContainer).not.toBeNull()
    expect(blockersContainer?.textContent).toContain('Base fee is empty')
    expect(blockersContainer?.textContent).toContain('URL is not a valid URL')
  })

  it('enables Save button and removes aria-describedby when blockers list is empty', () => {
    render(
      <SaveBar
        changes={dummyChanges}
        blockers={[]}
        isSaving={false}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).not.toBeDisabled()
    expect(saveButton).not.toHaveAttribute('aria-describedby')
    expect(document.getElementById('save-all-blockers')).toBeNull()
  })

  it('invokes onSave and onDiscard callbacks on button clicks', () => {
    const mockOnSave = jest.fn()
    const mockOnDiscard = jest.fn()

    render(
      <SaveBar
        changes={dummyChanges}
        blockers={[]}
        isSaving={false}
        onDiscard={mockOnDiscard}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(mockOnDiscard).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('disables buttons and shows "Saving…" while isSaving is true', () => {
    render(
      <SaveBar
        changes={dummyChanges}
        blockers={[]}
        isSaving={true}
        onDiscard={jest.fn()}
        onSave={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /saving…/i })
    const discardButton = screen.getByRole('button', { name: /discard/i })

    expect(saveButton).toBeDisabled()
    expect(discardButton).toBeDisabled()
  })
})
