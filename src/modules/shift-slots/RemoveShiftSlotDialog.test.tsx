import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { RemoveShiftSlotDialog } from './RemoveShiftSlotDialog'

const mockRemoveSlot = jest.fn()
const mockUseRemove = jest.fn()

jest.mock('../../api/shiftSlotApi', () => ({
  useRemoveShiftSlotMutation: () => mockUseRemove(),
}))

const slot: ShiftSlotAdminDto = {
  id: 'slot-fri',
  weekday: 5,
  startMinute: 1140,
  endMinute: 1380,
  riderCap: 6,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  removedAt: null,
}

// Spec 0026 (row 77, AC-6): Remove asks first, naming the slot.
describe('RemoveShiftSlotDialog (spec 0026, AC-6)', () => {
  const onClose = jest.fn()
  const onCloseAutoFocus = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRemove.mockReturnValue([mockRemoveSlot, { isLoading: false }])
  })

  it('asks first, naming the slot in words, and removes nothing until confirmed', () => {
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Remove this slot?' })).toBeInTheDocument()
    expect(screen.getByText(/Friday 19:00 to 23:00, 6 riders\./)).toBeInTheDocument()
    expect(mockRemoveSlot).not.toHaveBeenCalled()
  })

  it('confirm calls remove with the slot id, then closes', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.resolve({ ...slot, removedAt: '2026-11-03T08:00:00.000Z' }) })
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockRemoveSlot).toHaveBeenCalledWith({ id: 'slot-fri' })
  })

  it('Cancel closes without removing', () => {
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(mockRemoveSlot).not.toHaveBeenCalled()
  })

  it('shows the backend sentence when the removal fails, and stays open', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.reject({ message: 'This slot just changed. Look again.' }) })
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot just changed. Look again.')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('falls back to a plain sentence when the failure carries none', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.reject(new Error('')) })
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The slot could not be removed. Try again in a moment.')
  })

  it('disables both buttons while removing', () => {
    mockUseRemove.mockReturnValue([mockRemoveSlot, { isLoading: true }])
    render(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    expect(screen.getByRole('button', { name: /Remove/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('passes onCloseAutoFocus to the dialog, so focus can go back to the row', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(true)
      const opener = React.useRef<HTMLButtonElement>(null)
      return (
        <div>
          <button ref={opener} type="button">
            Remove Friday 19:00
          </button>
          {open ? (
            <RemoveShiftSlotDialog
              slot={slot}
              onClose={() => setOpen(false)}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                opener.current?.focus()
              }}
            />
          ) : null}
        </div>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Remove Friday 19:00', hidden: true })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(document.activeElement).toBe(opener)
    })
  })
})
