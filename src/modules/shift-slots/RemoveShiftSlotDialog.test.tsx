import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { RemoveShiftSlotDialog } from './RemoveShiftSlotDialog'

const mockRemoveSlot = jest.fn()
const mockUseRemove = jest.fn()

jest.mock('../../api/shiftSlotApi', () => {
  const actual = jest.requireActual('../../api/shiftSlotApi')
  return {
    isShiftSlotConflict: actual.isShiftSlotConflict,
    refreshShiftSlots: actual.refreshShiftSlots,
    useRemoveShiftSlotMutation: () => mockUseRemove(),
  }
})

let store: ReturnType<typeof makeStore>
let dispatchSpy: jest.SpyInstance
function StoreWrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
const renderWithStore = (ui: React.ReactElement) => render(ui, { wrapper: StoreWrapper })
const refreshDispatched = () =>
  dispatchSpy.mock.calls.some(
    ([action]) => action?.type === 'api/invalidateTags' && JSON.stringify(action.payload) === JSON.stringify(['ShiftSlots'])
  )

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
    store = makeStore()
    dispatchSpy = jest.spyOn(store, 'dispatch')
    mockUseRemove.mockReturnValue([mockRemoveSlot, { isLoading: false }])
  })

  it('asks first, naming the slot in words, and removes nothing until confirmed', () => {
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Remove this slot?' })).toBeInTheDocument()
    expect(screen.getByText(/Friday 19:00 to 23:00, 6 riders\./)).toBeInTheDocument()
    expect(mockRemoveSlot).not.toHaveBeenCalled()
  })

  it('confirm calls remove with the slot id, then closes', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.resolve({ ...slot, removedAt: '2026-11-03T08:00:00.000Z' }) })
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockRemoveSlot).toHaveBeenCalledWith({ id: 'slot-fri' })
  })

  it('Cancel closes without removing', () => {
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(mockRemoveSlot).not.toHaveBeenCalled()
  })

  it('shows the backend sentence when the removal fails, and stays open', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.reject({ message: 'This slot just changed. Look again.' }) })
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot just changed. Look again.')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('on a 409 shows the sentence and reads the slots again', async () => {
    mockRemoveSlot.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 409, message: 'This slot just changed. Look again.' }),
    })
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot just changed. Look again.')
    expect(refreshDispatched()).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each([404, 500, undefined])('does not read the slots again for a non-409 error (status %p)', async (statusCode) => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.reject({ statusCode, message: 'Something else went wrong.' }) })
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something else went wrong.')
    expect(refreshDispatched()).toBe(false)
  })

  it('falls back to a plain sentence when the failure carries none', async () => {
    mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.reject(new Error('')) })
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The slot could not be removed. Try again in a moment.')
  })

  it('disables both buttons while removing', () => {
    mockUseRemove.mockReturnValue([mockRemoveSlot, { isLoading: true }])
    renderWithStore(<RemoveShiftSlotDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)
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
    renderWithStore(<Harness />)
    const opener = screen.getByRole('button', { name: 'Remove Friday 19:00', hidden: true })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(document.activeElement).toBe(opener)
    })
  })
})
