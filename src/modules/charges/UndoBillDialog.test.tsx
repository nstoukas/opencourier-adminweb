import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import { UndoBillDialog, UNDO_REASON_MAX } from './UndoBillDialog'
import { refreshPartnerCharges } from '@/api/partnerChargeApi'
import type { PartnerBillDto } from '@/backend-admin-sdk'

const mockUndoPartnerBill = jest.fn()

jest.mock('../../api/partnerChargeApi', () => ({
  ...jest.requireActual('../../api/partnerChargeApi'),
  useUndoPartnerBillMutation: () => [mockUndoPartnerBill, { isLoading: false }],
}))

const sampleBill: PartnerBillDto = {
  id: 'bill-123',
  month: '2026-11',
  reference: 'INV-42',
  createdAt: '2026-11-18T10:00:00Z',
  billedByLabel: 'admin@coop.gr',
  lineCount: 3,
  totals: [{ currencyCode: 'EUR', amount: 3000 }],
  undoneAt: null,
  undoneByLabel: null,
  undoReason: null,
  chargeIds: ['c-1', 'c-2', 'c-3'],
}

describe('UndoBillDialog (spec 0036, AC-7)', () => {
  let store: ReturnType<typeof makeStore>
  const mockOnClose = jest.fn()
  const mockOnSaved = jest.fn()
  const mockOnCloseAutoFocus = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    store = makeStore()
  })

  function renderDialog(bill = sampleBill) {
    return render(
      <Provider store={store}>
        <UndoBillDialog
          bill={bill}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          onCloseAutoFocus={mockOnCloseAutoFocus}
        />
      </Provider>
    )
  }

  it('renders bill label in dialog title and description', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Undo INV-42?' })).toBeInTheDocument()
    expect(screen.getByText(/3 lines become unbilled again/i)).toBeInTheDocument()
  })

  it('disables Undo button for empty or whitespace-only reason', () => {
    renderDialog()
    const undoButton = screen.getByRole('button', { name: 'Undo bill' })
    expect(undoButton).toBeDisabled()

    const textarea = screen.getByLabelText('Why')
    fireEvent.change(textarea, { target: { value: '    ' } })
    expect(undoButton).toBeDisabled()
  })

  it('disables Undo button when trimmed reason exceeds 300 characters', () => {
    renderDialog()
    const undoButton = screen.getByRole('button', { name: 'Undo bill' })
    const textarea = screen.getByLabelText('Why')

    const longReason = 'x'.repeat(UNDO_REASON_MAX + 1)
    fireEvent.change(textarea, { target: { value: longReason } })

    expect(undoButton).toBeDisabled()
    expect(screen.getByText(`At most ${UNDO_REASON_MAX} characters.`)).toBeInTheDocument()
  })

  it('sends the trimmed reason and invokes onSaved and onClose on success', async () => {
    mockUndoPartnerBill.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'bill-123' }),
    })

    renderDialog()
    const textarea = screen.getByLabelText('Why')
    fireEvent.change(textarea, { target: { value: '   Invoice was cancelled by accountant   ' } })

    const undoButton = screen.getByRole('button', { name: 'Undo bill' })
    expect(undoButton).toBeEnabled()
    fireEvent.click(undoButton)

    await waitFor(() => {
      expect(mockUndoPartnerBill).toHaveBeenCalledWith({
        billId: 'bill-123',
        reason: 'Invoice was cancelled by accountant',
      })
    })

    expect(mockOnSaved).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('dispatches refreshPartnerCharges on 409 error (already undone) and shows error alert', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')
    mockUndoPartnerBill.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 409,
          message: 'This bill has already been undone',
        }),
    })

    renderDialog()
    const textarea = screen.getByLabelText('Why')
    fireEvent.change(textarea, { target: { value: 'Mistake' } })
    fireEvent.click(screen.getByRole('button', { name: 'Undo bill' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(dispatchSpy).toHaveBeenCalledWith(refreshPartnerCharges())
    expect(screen.getByRole('alert')).toHaveTextContent('This bill has already been undone')
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('clicking Cancel closes dialog without undoing', () => {
    renderDialog()
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
    expect(mockOnSaved).not.toHaveBeenCalled()
    expect(mockUndoPartnerBill).not.toHaveBeenCalled()
  })
})
