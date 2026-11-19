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
})
