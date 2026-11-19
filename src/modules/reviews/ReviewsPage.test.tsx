import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ReviewsPage, REVIEWS_PAGE_SIZE, REVIEWS_POLL_MS } from './ReviewsPage'
import type { ReviewRequestAdminDto } from '@/backend-admin-sdk'

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    let resolvedHref = href
    if (typeof href === 'object' && href !== null) {
      let path = href.pathname || ''
      const query = href.query || {}
      for (const [key, value] of Object.entries(query)) {
        if (path.includes(`[${key}]`)) {
          path = path.replace(`[${key}]`, String(value))
        }
      }
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (!href.pathname?.includes(`[${key}]`)) {
          searchParams.set(key, String(value))
        }
      }
      const qs = searchParams.toString()
      resolvedHref = qs ? `${path}?${qs}` : path
    }
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    )
  }
})

// Mock RTK Query APIs
const mockUseGetReviewRequestsQuery = jest.fn()
jest.mock('../../api/reviewRequestApi', () => ({
  useGetReviewRequestsQuery: (arg: any, opts: any) => mockUseGetReviewRequestsQuery(arg, opts),
}))

const mockUseGetInstanceConfigQuery = jest.fn()
jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigQuery: (arg: any) => mockUseGetInstanceConfigQuery(arg),
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

// Mock AnswerReviewButton so the page test focuses on the table, tabs and lists
jest.mock('./AnswerReviewDialog', () => ({
  AnswerReviewButton: ({ request }: { request: ReviewRequestAdminDto }) => (
    <button data-testid={`answer-btn-${request.id}`}>Answer</button>
  ),
}))

describe('ReviewsPage (spec 0038, AC-5, AC-6, AC-7)', () => {
  const openRequest1: ReviewRequestAdminDto = {
    id: 'req-open-1',
    topic: 'PAY',
    note: 'I was underpaid by €1.50 for the delivery wait time.',
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
      id: 'deliv-101',
      pickupName: 'Souvlaki Bar',
      createdAt: '2026-11-19T07:30:00Z',
    },
  }

  const openRequestOverdue: ReviewRequestAdminDto = {
    id: 'req-open-2',
    topic: 'OFFER',
    note: 'The offer skipped me unfairly.',
    status: 'OPEN',
    createdAt: '2026-11-10T08:00:00Z',
    // dueAt in future relative to some clocks, but server explicitly flagged overdue: true
    dueAt: '2026-11-18T08:00:00Z',
    overdue: true,
    outcome: null,
    answer: null,
    answeredAt: null,
    withdrawnAt: null,
    correctionCents: null,
    correctionCurrency: null,
    courierId: 'c-202',
    courierName: 'Eleni Kostopoulou',
    answeredBy: null,
    delivery: null, // General request
  }

  const answeredRequest: ReviewRequestAdminDto = {
    id: 'req-ans-1',
    topic: 'PAY',
    note: 'Missing distance fee.',
    status: 'ANSWERED',
    createdAt: '2026-11-15T08:00:00Z',
    dueAt: '2026-11-29T08:00:00Z',
    overdue: false,
    outcome: 'CHANGED',
    answer: 'Checked the OSRM route: distance was understated. Corrected with €1.50.',
    answeredAt: '2026-11-16T12:00:00Z',
    withdrawnAt: null,
    correctionCents: 150,
    correctionCurrency: 'EUR',
    courierId: 'c-303',
    courierName: 'Dimitris Papadopoulos',
    answeredBy: 'admin@opencourier.gr',
    delivery: {
      id: 'deliv-202',
      pickupName: 'Pizza Volos',
      createdAt: '2026-11-15T07:45:00Z',
    },
  }

  const withdrawnRequest: ReviewRequestAdminDto = {
    id: 'req-with-1',
    topic: 'OTHER',
    note: 'Sent by mistake.',
    status: 'WITHDRAWN',
    createdAt: '2026-11-14T08:00:00Z',
    dueAt: '2026-11-28T08:00:00Z',
    overdue: false,
    outcome: null,
    answer: null,
    answeredAt: null,
    withdrawnAt: '2026-11-14T09:30:00Z',
    correctionCents: null,
    correctionCurrency: null,
    courierId: 'c-404',
    courierName: 'Maria Georgiou',
    answeredBy: null,
    delivery: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        reviewCorrectionMaxCents: 5000,
        currency: 'EUR',
      },
    })
    mockUseGetReviewRequestsQuery.mockReturnValue({
      data: {
        data: [openRequestOverdue, openRequest1],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 2 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    })
  })

  it('renders page header with honest title and description', () => {
    render(<ReviewsPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reviews')
    expect(
      screen.getByText(/A rider can ask a person to look again at any decision the app took about their work/i)
    ).toBeInTheDocument()
  })

  it('renders tabs for Open, Answered, and Withdrawn with Open active by default', () => {
    render(<ReviewsPage />)
    const openTab = screen.getByRole('tab', { name: 'Open' })
    const answeredTab = screen.getByRole('tab', { name: 'Answered' })
    const withdrawnTab = screen.getByRole('tab', { name: 'Withdrawn' })

    expect(openTab).toBeInTheDocument()
    expect(answeredTab).toBeInTheDocument()
    expect(withdrawnTab).toBeInTheDocument()
    expect(openTab).toHaveAttribute('data-state', 'active')
  })

  it('renders open requests in server order with rider, topic, delivery link, note, and answer button (AC-5)', () => {
    render(<ReviewsPage />)

    // Two rows rendered in the order returned by API
    const rows = screen.getAllByRole('row')
    // row 0 is header, rows 1 and 2 are data
    expect(rows).toHaveLength(3)
    const eleniRow = rows[1] as HTMLElement
    const nikosRow = rows[2] as HTMLElement

    // Row 1: Eleni (overdue, general request)
    expect(within(eleniRow).getByText('Eleni Kostopoulou')).toBeInTheDocument()
    expect(within(eleniRow).getByText('An offer')).toBeInTheDocument()
    expect(within(eleniRow).getByText('General')).toBeInTheDocument()
    expect(within(eleniRow).getByText('The offer skipped me unfairly.')).toBeInTheDocument()
    expect(within(eleniRow).getByTestId('answer-btn-req-open-2')).toBeInTheDocument()

    // Row 2: Nikos (not overdue, linked to delivery)
    expect(within(nikosRow).getByText('Nikos Arvanitis')).toBeInTheDocument()
    expect(within(nikosRow).getByText('Pay')).toBeInTheDocument()
    expect(within(nikosRow).getByText(/Souvlaki Bar/)).toBeInTheDocument()
    const deliveryLink = within(nikosRow).getByRole('link', { name: /Souvlaki Bar/ })
    expect(deliveryLink).toHaveAttribute('href', expect.stringContaining('deliv-101'))
    expect(within(nikosRow).getByText('I was underpaid by €1.50 for the delivery wait time.')).toBeInTheDocument()
    expect(within(nikosRow).getByTestId('answer-btn-req-open-1')).toBeInTheDocument()
  })

  it('relies strictly on server overdue flag for overdue text and styling (AC-5)', () => {
    render(<ReviewsPage />)

    // Request with overdue: true shows "Overdue" in text-destructive red style
    const overdueSpan = screen.getByText('Overdue')
    expect(overdueSpan).toBeInTheDocument()
    expect(overdueSpan).toHaveClass('font-semibold text-destructive')

    // Request with overdue: false does NOT have text-destructive class and shows days left
    const notOverdueSpan = screen.getByText(/left/i)
    expect(notOverdueSpan).toBeInTheDocument()
    expect(notOverdueSpan).not.toHaveClass('text-destructive')
  })

  it('switches to Answered tab and displays outcome, answer, pay correction, and admin (AC-5, AC-6, AC-7)', () => {
    mockUseGetReviewRequestsQuery.mockImplementation(({ status }) => {
      if (status === 'ANSWERED') {
        return {
          data: {
            data: [answeredRequest],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
          },
          isLoading: false,
          isFetching: false,
          isError: false,
        }
      }
      return { data: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } } }
    })

    render(<ReviewsPage />)
    const answeredTab = screen.getByRole('tab', { name: 'Answered' })
    fireEvent.mouseDown(answeredTab, { button: 0 })

    expect(mockUseGetReviewRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ANSWERED', page: 1, perPage: REVIEWS_PAGE_SIZE }),
      expect.anything()
    )

    expect(screen.getByText('Dimitris Papadopoulos')).toBeInTheDocument()
    expect(screen.getByText('Changed and put right')).toBeInTheDocument()
    expect(
      screen.getByText('Checked the OSRM route: distance was understated. Corrected with €1.50.')
    ).toBeInTheDocument()
    expect(screen.getByText('Pay correction: €1.50')).toBeInTheDocument()
    expect(screen.getByText('Answered by admin@opencourier.gr')).toBeInTheDocument()
    // No Answer button on answered tab
    expect(screen.queryByTestId('answer-btn-req-ans-1')).toBeNull()
  })

  it('switches to Withdrawn tab and displays withdrawn request details (AC-5)', () => {
    mockUseGetReviewRequestsQuery.mockImplementation(({ status }) => {
      if (status === 'WITHDRAWN') {
        return {
          data: {
            data: [withdrawnRequest],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
          },
          isLoading: false,
          isFetching: false,
          isError: false,
        }
      }
      return { data: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } } }
    })

    render(<ReviewsPage />)
    const withdrawnTab = screen.getByRole('tab', { name: 'Withdrawn' })
    fireEvent.mouseDown(withdrawnTab, { button: 0 })

    expect(mockUseGetReviewRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'WITHDRAWN', page: 1, perPage: REVIEWS_PAGE_SIZE }),
      expect.anything()
    )

    expect(screen.getByText('Maria Georgiou')).toBeInTheDocument()
    expect(screen.getByText('Something else')).toBeInTheDocument()
    expect(screen.getByText('Sent by mistake.')).toBeInTheDocument()
  })

  it('shows honest empty state message for Open tab and other tabs', () => {
    mockUseGetReviewRequestsQuery.mockReturnValue({
      data: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } },
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ReviewsPage />)
    expect(screen.getByText('No request is waiting for an answer.')).toBeInTheDocument()

    // Switch to Answered tab
    const answeredTab = screen.getByRole('tab', { name: 'Answered' })
    fireEvent.mouseDown(answeredTab, { button: 0 })

    expect(screen.getByText('None yet.')).toBeInTheDocument()
  })

  it('displays alert message when request list fails to load (AC-5)', () => {
    mockUseGetReviewRequestsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    })

    render(<ReviewsPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The review requests could not be loaded. The list below may be out of date.')
  })

  it('renders pagination buttons and allows paging when multiple pages exist', () => {
    mockUseGetReviewRequestsQuery.mockReturnValue({
      data: {
        data: [openRequest1],
        pagination: { currentPage: 1, totalPages: 3, totalItems: 50, nextPage: 2, prevPage: null },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ReviewsPage />)

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    const prevButton = screen.getByRole('button', { name: 'Previous' })
    const nextButton = screen.getByRole('button', { name: 'Next' })

    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)
    expect(mockUseGetReviewRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    )
  })

  it('polls requests every 30 seconds while page is visible', () => {
    mockPageVisible = true
    render(<ReviewsPage />)

    expect(mockUseGetReviewRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN', page: 1, perPage: REVIEWS_PAGE_SIZE }),
      expect.objectContaining({ pollingInterval: REVIEWS_POLL_MS })
    )
    expect(REVIEWS_POLL_MS).toBe(30_000)
  })

  it('pauses polling when page is not visible', () => {
    mockPageVisible = false
    render(<ReviewsPage />)

    expect(mockUseGetReviewRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN', page: 1, perPage: REVIEWS_PAGE_SIZE }),
      expect.objectContaining({ pollingInterval: 0 })
    )
  })
})
