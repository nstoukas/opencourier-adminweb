import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AnswerReviewButton } from './AnswerReviewDialog'
import { refreshReviewRequests, useAnswerReviewRequestMutation } from '../../api/reviewRequestApi'
import type { ReviewRequestAdminDto } from '../../backend-admin-sdk'

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockDispatch = jest.fn()
jest.mock('../../ui-shared-utils', () => {
  const actual = jest.requireActual('../../ui-shared-utils')
  return {
    ...actual,
    useAppDispatch: () => mockDispatch,
  }
})

jest.mock('../../api/reviewRequestApi', () => {
  const actual = jest.requireActual('../../api/reviewRequestApi')
  return {
    ...actual,
    useAnswerReviewRequestMutation: jest.fn(),
  }
})

const mockUseAnswerReviewRequestMutation = useAnswerReviewRequestMutation as jest.Mock

describe('AnswerReviewButton & AnswerReviewDialog (spec 0038, AC-6, AC-7)', () => {
  let mockAnswer: jest.Mock

  const deliveryLinkedRequest: ReviewRequestAdminDto = {
    id: 'req-1',
    topic: 'PAY',
    note: 'The wait time at Souvlaki Bar was 20 minutes but not credited.',
    status: 'OPEN',
    createdAt: '2026-11-19T08:00:00Z',
    dueAt: '2026-11-20T08:00:00Z',
    overdue: false,
    outcome: null,
    answer: null,
    answeredAt: null,
    withdrawnAt: null,
    correctionCents: null,
    correctionCurrency: null,
    courierId: 'c-101',
    courierName: 'Nikos Arvanitis',
    answeredBy: null,
    delivery: {
      id: 'del-101',
      pickupName: 'Souvlaki Bar',
      createdAt: '2026-11-19T07:30:00Z',
    },
  }

  const generalRequest: ReviewRequestAdminDto = {
    id: 'req-gen',
    topic: 'OFFER',
    note: 'Offers stopped reaching me around 2pm.',
    status: 'OPEN',
    createdAt: '2026-11-19T08:00:00Z',
    dueAt: '2026-11-25T08:00:00Z',
    overdue: false,
    outcome: null,
    answer: null,
    answeredAt: null,
    withdrawnAt: null,
    correctionCents: null,
    correctionCurrency: null,
    courierId: 'c-202',
    courierName: 'Eleni Kostopoulou',
    answeredBy: null,
    delivery: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAnswer = jest.fn()
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: false }])
  })

  it('renders Answer button and opens dialog displaying rider note and required fields', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )

    const trigger = screen.getByRole('button', { name: 'Answer' })
    expect(trigger).toBeInTheDocument()

    fireEvent.click(trigger)

    expect(screen.getByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeInTheDocument()
    expect(screen.getByText('The wait time at Souvlaki Bar was 20 minutes but not credited.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'The decision stands' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Changed and put right' })).toBeInTheDocument()
    expect(screen.getByLabelText('Reason')).toBeInTheDocument()

    // Send answer button is disabled until outcome and reason are supplied
    const sendBtn = screen.getByRole('button', { name: 'Send answer' })
    expect(sendBtn).toBeDisabled()
  })

  it('requires outcome and reason (1 to 2000 chars) before answer can be sent (AC-6)', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    const sendBtn = screen.getByRole('button', { name: 'Send answer' })
    expect(sendBtn).toBeDisabled()

    // Select outcome only -> still disabled
    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    expect(sendBtn).toBeDisabled()

    // Type empty whitespace reason -> still disabled
    const reasonInput = screen.getByLabelText('Reason')
    fireEvent.change(reasonInput, { target: { value: '   ' } })
    expect(sendBtn).toBeDisabled()

    // Type valid reason -> enabled
    fireEvent.change(reasonInput, { target: { value: 'The wait was within the standard window.' } })
    expect(sendBtn).not.toBeDisabled()
  })

  it('outcome STANDS never renders pay correction field and sends no correction (AC-7)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-1', status: 'ANSWERED' }),
    })

    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'The wait was only 3 minutes.' },
    })

    // Pay correction field must NOT be rendered when outcome is STANDS
    expect(screen.queryByLabelText(/Pay correction in euro/i)).toBeNull()

    // Submitting with STANDS
    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      expect(mockAnswer).toHaveBeenCalledTimes(1)
      expect(mockAnswer).toHaveBeenCalledWith({
        id: 'req-1',
        input: {
          outcome: 'STANDS',
          answer: 'The wait was only 3 minutes.',
        },
      })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Answer sent',
        description: 'Nikos Arvanitis can read it in the app.',
      })
    })
  })

  it('outcome CHANGED on a general request (no delivery) never renders pay correction field (AC-7)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-gen', status: 'ANSWERED' }),
    })

    render(
      <AnswerReviewButton
        request={generalRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Investigated phone connection issue.' },
    })

    // General request cannot have a pay correction
    expect(screen.queryByLabelText(/Pay correction in euro/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      expect(mockAnswer).toHaveBeenCalledWith({
        id: 'req-gen',
        input: {
          outcome: 'CHANGED',
          answer: 'Investigated phone connection issue.',
        },
      })
    })
  })

  it('refuses a correction above reviewCorrectionMaxCents and disables submit (AC-7)', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000} // €50.00 limit
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Approved wait time compensation.' },
    })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)

    // Type 50.01 euro (5001 cents > 5000 cents cap)
    fireEvent.change(correctionInput, { target: { value: '50.01' } })

    expect(screen.getByText("At most €50.00, the co-op's limit.")).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeDisabled()
  })

  it('refuses invalid correction inputs (zero, negative, non-numeric, >2 decimals) (AC-7)', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Reason text' } })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)

    const invalidInputs = ['0', '-1.50', 'abc', '1.234']
    for (const input of invalidInputs) {
      fireEvent.change(correctionInput, { target: { value: input } })
      expect(screen.getByText('Write an amount in euro above 0, such as 1.50.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send answer' })).toBeDisabled()
    }
  })

  it('requires a confirm step that repeats the amount before sending correction (AC-7)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-1', status: 'ANSWERED' }),
    })

    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Corrected 15 minutes of excess wait.' },
    })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)
    // Type euro amount with comma
    fireEvent.change(correctionInput, { target: { value: '1,50' } })

    // Valid correction changes button to "Next"
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).not.toBeDisabled()

    // Clicking Next enters confirm step; answer has NOT been submitted yet
    fireEvent.click(nextBtn)
    expect(mockAnswer).not.toHaveBeenCalled()

    // Confirm step repeats the amount in the title and description
    expect(
      screen.getByRole('heading', { name: "Add €1.50 to this rider's pay?" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nikos Arvanitis is paid €1.50 more for this delivery, on today's earnings/i)
    ).toBeInTheDocument()

    // Confirm step has Back button which returns to write step
    const backBtn = screen.getByRole('button', { name: 'Back' })
    fireEvent.click(backBtn)
    expect(screen.getByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('1,50')).toBeInTheDocument()

    // Go to confirm step again and send
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    const confirmBtn = screen.getByRole('button', { name: 'Send and add €1.50' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockAnswer).toHaveBeenCalledTimes(1)
      expect(mockAnswer).toHaveBeenCalledWith({
        id: 'req-1',
        input: {
          outcome: 'CHANGED',
          answer: 'Corrected 15 minutes of excess wait.',
          correctionCents: 150,
        },
      })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Answer sent',
        description: 'Nikos Arvanitis can read it in the app.',
      })
    })
  })

  it('closes dialog, reloads list and displays toast on 409 conflict error (AC-6)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 409,
          message: 'This review request has already been answered or withdrawn.',
        }),
    })

    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Late response' } })

    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      // 409 closes the dialog
      expect(screen.queryByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeNull()

      // 409 reloads the requests list via refreshReviewRequests action
      expect(mockDispatch).toHaveBeenCalledWith(refreshReviewRequests())

      // 409 shows destructive toast with server conflict message
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Not sent',
        description: 'This review request has already been answered or withdrawn.',
        variant: 'destructive',
      })
    })
  })

  it('keeps dialog open and displays inline alert on non-409 error (AC-6)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          statusCode: 500,
          message: 'Database connection failed',
        }),
    })

    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Valid explanation' } })

    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      // Dialog remains open
      expect(screen.getByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeInTheDocument()

      // Inline alert is displayed
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Database connection failed')
    })
  })

  it('shows limit loading message and disables Next when correctionMaxCents is null (cap not loaded)', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={null}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Approved wait time compensation.' },
    })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)
    fireEvent.change(correctionInput, { target: { value: '1.50' } })

    expect(
      screen.getByText("The co-op's limit has not loaded yet. Try again in a moment.")
    ).toBeInTheDocument()

    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeDisabled()

    // Clicking Next does nothing and confirm step never opens
    fireEvent.click(nextBtn)
    expect(screen.queryByRole('heading', { name: /Add €1\.50/i })).toBeNull()
  })

  it('disables Send, Next, Back, Not now and refuses closing when isLoading is true (double submit lock)', () => {
    // Start with isLoading: false so dialog can be opened
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: false }])

    const { rerender } = render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )

    // Open write step with STANDS
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Valid explanation' } })

    // When mutation is loading: Send and Not now are disabled, closing is refused
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: true }])
    rerender(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )

    expect(screen.getByRole('button', { name: 'Not now' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()

    // Closing via Escape or clicking Not now is refused
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.getByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeInTheDocument()

    // Test write step with correction (Next button)
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: false }])
    rerender(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText(/Pay correction in euro/i), { target: { value: '1.50' } })

    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: true }])
    rerender(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()

    // Move to confirm step while not loading
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: false }])
    rerender(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: "Add €1.50 to this rider's pay?" })).toBeInTheDocument()

    // On confirm step with isLoading: true: Back and Send are disabled, closing refused
    mockUseAnswerReviewRequestMutation.mockReturnValue([mockAnswer, { isLoading: true }])
    rerender(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: "Add €1.50 to this rider's pay?" })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('heading', { name: "Add €1.50 to this rider's pay?" })).toBeInTheDocument()
  })

  it('converts amounts "0.29", "1.15", "19.99", "0,50" into whole cents (29, 115, 1999, 50) in the answer request (AC-7)', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-1', status: 'ANSWERED' }),
    })

    const testCases = [
      { input: '0.29', expectedCents: 29 },
      { input: '1.15', expectedCents: 115 },
      { input: '19.99', expectedCents: 1999 },
      { input: '0,50', expectedCents: 50 },
    ]

    for (const { input, expectedCents } of testCases) {
      mockAnswer.mockClear()
      const { unmount } = render(
        <AnswerReviewButton
          request={deliveryLinkedRequest}
          correctionMaxCents={5000}
          currencyCode="EUR"
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
      fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Correction explanation' } })

      const correctionInput = screen.getByLabelText(/Pay correction in euro/i)
      fireEvent.change(correctionInput, { target: { value: input } })

      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      const sendBtn = screen.getByRole('button', { name: /^Send and add/ })
      fireEvent.click(sendBtn)

      await waitFor(() => {
        expect(mockAnswer).toHaveBeenCalledWith({
          id: 'req-1',
          input: {
            outcome: 'CHANGED',
            answer: 'Correction explanation',
            correctionCents: expectedCents,
          },
        })
      })

      unmount()
    }
  })

  it('refuses formats "1.000", "1,000.50", "-1", "1.505", "€2" with error and disables submit', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Reason text' } })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)
    const refused = ['1.000', '1,000.50', '-1', '1.505', '€2']

    for (const val of refused) {
      fireEvent.change(correctionInput, { target: { value: val } })
      expect(screen.getByText('Write an amount in euro above 0, such as 1.50.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send answer' })).toBeDisabled()
    }
  })

  it('does not send a typed correction if outcome is switched back to STANDS', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-1', status: 'ANSWERED' }),
    })

    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))

    // First select CHANGED and type a correction
    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Reconsidered outcome' } })
    fireEvent.change(screen.getByLabelText(/Pay correction in euro/i), { target: { value: '15.00' } })

    // Now switch back to STANDS
    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))

    // Correction field is hidden
    expect(screen.queryByLabelText(/Pay correction in euro/i)).toBeNull()

    // Send answer
    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      expect(mockAnswer).toHaveBeenCalledWith({
        id: 'req-1',
        input: {
          outcome: 'STANDS',
          answer: 'Reconsidered outcome',
        },
      })
      expect(mockAnswer.mock.calls[0][0].input).not.toHaveProperty('correctionCents')
    })
  })

  it('puts focus on Back in confirm step, marks header as role alert, and points correction aria-describedby to help and error', () => {
    render(
      <AnswerReviewButton
        request={deliveryLinkedRequest}
        correctionMaxCents={5000}
        currencyCode="EUR"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Changed and put right' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Approved wait time' } })

    const correctionInput = screen.getByLabelText(/Pay correction in euro/i)
    // Initially without error: aria-describedby points only to help
    expect(correctionInput).toHaveAttribute('aria-describedby', `review-correction-help-${deliveryLinkedRequest.id}`)
    expect(document.getElementById(`review-correction-help-${deliveryLinkedRequest.id}`)).toBeInTheDocument()
    expect(document.getElementById(`review-correction-error-${deliveryLinkedRequest.id}`)).toBeNull()

    // When an error is present: aria-describedby points to help and error (which has role="alert")
    fireEvent.change(correctionInput, { target: { value: 'invalid' } })
    expect(correctionInput).toHaveAttribute(
      'aria-describedby',
      `review-correction-help-${deliveryLinkedRequest.id} review-correction-error-${deliveryLinkedRequest.id}`
    )
    const errorEl = document.getElementById(`review-correction-error-${deliveryLinkedRequest.id}`)
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveAttribute('role', 'alert')
    expect(errorEl).toHaveTextContent('Write an amount in euro above 0, such as 1.50.')

    // Type valid correction and move to confirm step
    fireEvent.change(correctionInput, { target: { value: '1.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Confirm step header has role alert
    const confirmAlert = screen.getByRole('alert')
    expect(confirmAlert).toHaveTextContent(/Add €1\.50 to this rider's pay\?/i)

    // Focus is placed on Back button, never on the button that pays
    const backBtn = screen.getByRole('button', { name: 'Back' })
    const sendBtn = screen.getByRole('button', { name: 'Send and add €1.50' })
    expect(document.activeElement).toBe(backBtn)
    expect(document.activeElement).not.toBe(sendBtn)
  })

  it('moves focus to the element with id "main" after a successful answer', async () => {
    mockAnswer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'req-1', status: 'ANSWERED' }),
    })

    render(
      <div>
        <main id="main" tabIndex={-1}>
          <h1>Main Content</h1>
        </main>
        <AnswerReviewButton
          request={deliveryLinkedRequest}
          correctionMaxCents={5000}
          currencyCode="EUR"
        />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }))
    fireEvent.click(screen.getByRole('radio', { name: 'The decision stands' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Confirmed right.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Answer Nikos Arvanitis' })).toBeNull()
    })

    const mainEl = document.getElementById('main')
    expect(document.activeElement).toBe(mainEl)
  })
})
