import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import { MarkBilledDialog, REFERENCE_MAX } from './MarkBilledDialog'
import { refreshPartnerCharges } from '@/api/partnerChargeApi'
import type { PartnerChargeBilledLineDto } from '@/backend-admin-sdk'

const mockCreatePartnerBill = jest.fn()

jest.mock('../../api/partnerChargeApi', () => ({
  ...jest.requireActual('../../api/partnerChargeApi'),
  useCreatePartnerBillMutation: () => [mockCreatePartnerBill, { isLoading: false }],
}))

const sampleUnbilled: PartnerChargeBilledLineDto[] = [
  {
    id: 'charge-1',
    createdAt: '2026-11-18T10:00:00Z',
    happenedAt: '2026-11-18T10:00:00Z',
    reason: 'WAITING',
    waitMinutes: 10,
    removalLabel: null,
    amount: 1000,
    currencyCode: 'EUR',
    deliveryId: 'del-111111111111',
    orderReference: 'ORD-1',
    billId: null,
    bill: null,
  },
  {
    id: 'charge-2',
    createdAt: '2026-11-18T11:00:00Z',
    happenedAt: '2026-11-18T11:00:00Z',
    reason: 'CANCELLATION',
    waitMinutes: null,
    removalLabel: null,
    amount: 1500,
    currencyCode: 'EUR',
    deliveryId: 'del-222222222222',
    orderReference: null,
    billId: null,
    bill: null,
  },
]

describe('MarkBilledDialog (spec 0036, AC-5, AC-6)', () => {
  let store: ReturnType<typeof makeStore>
  const mockOnOpenChange = jest.fn()
  const mockOnSaved = jest.fn()
  const mockOnCloseAutoFocus = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    store = makeStore()
  })

  function renderDialog(unbilled = sampleUnbilled, open = true) {
    return render(
      <Provider store={store}>
        <MarkBilledDialog
          open={open}
          partnerId="partner-1"
          month="2026-11"
          unbilled={unbilled}
          onOpenChange={mockOnOpenChange}
          onSaved={mockOnSaved}
          onCloseAutoFocus={mockOnCloseAutoFocus}
        />
      </Provider>
    )
  }

  it('starts with every unbilled line ticked and Confirm button enabled', () => {
    renderDialog()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()

    const confirmButton = screen.getByRole('button', { name: 'Confirm 2 lines' })
    expect(confirmButton).toBeEnabled()
  })

  it('unticking one line sends only the other ticked lines', async () => {
    mockCreatePartnerBill.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'bill-1' }),
    })

    renderDialog()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0] as HTMLElement) // Untick charge-1

    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()

    const confirmButton = screen.getByRole('button', { name: 'Confirm 1 line' })
    expect(confirmButton).toBeEnabled()

    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockCreatePartnerBill).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        month: '2026-11',
        chargeIds: ['charge-2'],
      })
    })

    expect(mockOnSaved).toHaveBeenCalledTimes(1)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables Confirm when all lines are unticked', () => {
    renderDialog()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0] as HTMLElement)
    fireEvent.click(checkboxes[1] as HTMLElement)

    const confirmButton = screen.getByRole('button', { name: 'Confirm 0 lines' })
    expect(confirmButton).toBeDisabled()
  })

  it('trims reference and includes it when non-empty, omits reference when blank', async () => {
    mockCreatePartnerBill.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'bill-1' }),
    })

    renderDialog()

    const input = screen.getByLabelText(/Invoice number/i)
    fireEvent.change(input, { target: { value: '   INV-999   ' } })

    const confirmButton = screen.getByRole('button', { name: 'Confirm 2 lines' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockCreatePartnerBill).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        month: '2026-11',
        chargeIds: ['charge-1', 'charge-2'],
        reference: 'INV-999',
      })
    })

    // Blank reference test
    jest.clearAllMocks()
    renderDialog()
    const input2 = screen.getByLabelText(/Invoice number/i)
    fireEvent.change(input2, { target: { value: '      ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 lines' }))

    await waitFor(() => {
      expect(mockCreatePartnerBill).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        month: '2026-11',
        chargeIds: ['charge-1', 'charge-2'],
      })
    })
    expect(mockCreatePartnerBill.mock.calls[0][0]).not.toHaveProperty('reference')
  })

  it('disables Confirm when reference exceeds REFERENCE_MAX (60) characters after trimming', () => {
    renderDialog()

    const input = screen.getByLabelText(/Invoice number/i)
    const longRef = 'A'.repeat(REFERENCE_MAX + 1)
    fireEvent.change(input, { target: { value: longRef } })

    expect(screen.getByText(`At most ${REFERENCE_MAX} characters.`)).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: 'Confirm 2 lines' })
    expect(confirmButton).toBeDisabled()
  })

  it('on a 409 carrying alreadyBilled ids: stays open, dispatches refreshPartnerCharges, and names the billed lines', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    mockCreatePartnerBill.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 409,
          alreadyBilled: ['charge-1'],
        }),
    })

    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 lines' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Dialog stays open
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    expect(mockOnSaved).not.toHaveBeenCalled()

    // Dispatches refreshPartnerCharges() to invalidate partnerCharges tag
    expect(dispatchSpy).toHaveBeenCalledWith(refreshPartnerCharges())

    // Names charge-1 by adminOrderLabel: "ORD-1 · 111111"
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Nothing was billed: someone else just billed ORD-1 · 111111.')
    expect(alert).toHaveTextContent('The list is up to date now; check it and confirm again.')
  })

  it('on a 409 without alreadyBilled ids: stays open, dispatches refresh, and shows generic message', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    mockCreatePartnerBill.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 409,
        }),
    })

    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 lines' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(dispatchSpy).toHaveBeenCalledWith(refreshPartnerCharges())
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nothing was billed: some of these lines were just billed by someone else. The list is up to date now.'
    )
  })

  it('on general errors (e.g. 400), shows the backend message', async () => {
    mockCreatePartnerBill.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 400,
          message: 'Unknown charge in request',
        }),
    })

    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 2 lines' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unknown charge in request')
    })
  })

  it('clicking Cancel closes the dialog without saving', () => {
    renderDialog()

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnSaved).not.toHaveBeenCalled()
  })
})
