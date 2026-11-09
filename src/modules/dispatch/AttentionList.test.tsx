import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AttentionList } from './AttentionList'
import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'
import { DeliveryAdminDtoStatusEnum } from '@/backend-admin-sdk'
import { useMarkDeliveryIssueHandledMutation } from '../../api/deliveriesApi'
import { useToast } from '../../admin-web-components'

const mockMarkHandledUnwrap = jest.fn()
const mockMarkHandled = jest.fn(() => ({ unwrap: mockMarkHandledUnwrap }))
const mockToast = jest.fn()

jest.mock('../../api/deliveriesApi', () => ({
  useMarkDeliveryIssueHandledMutation: jest.fn(),
  useAssignDeliveryToCourierMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
}))

jest.mock('../../api/couriersApi', () => ({
  useGetAllCouriersQuery: jest.fn(() => ({ data: [], isLoading: false })),
}))

jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: jest.fn(),
  }
})

const mockUseMarkDeliveryIssueHandledMutation = useMarkDeliveryIssueHandledMutation as jest.Mock
const mockUseToast = useToast as jest.Mock

describe('AttentionList (spec 0034, AC-3 to AC-9)', () => {
  const nowMs = new Date('2026-11-09T14:30:00.000Z').getTime()

  beforeEach(() => {
    jest.clearAllMocks()
    mockMarkHandledUnwrap.mockResolvedValue({})
    mockUseMarkDeliveryIssueHandledMutation.mockReturnValue([mockMarkHandled, { isLoading: false }])
    mockUseToast.mockReturnValue({ toast: mockToast })
  })

  it('renders "Nothing needs attention" when rows list is empty (AC-15 empty state)', () => {
    render(<AttentionList rows={[]} more={0} nowMs={nowMs} />)

    expect(screen.getByText('Needs attention · 0')).toBeInTheDocument()
    expect(screen.getByText('Nothing needs attention')).toBeInTheDocument()
  })

  it('displays total count in title as rows.length + more, and renders "and N more" when more > 0 (AC-3)', () => {
    const rows: DispatchAttentionRowDto[] = [
      {
        id: 'r1',
        kind: 'WAITING_FOR_RIDER',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'REF1',
        restaurantName: 'Souvlaki Bar',
        riderName: null,
        customerLabel: 'Nikos P.',
        detail: 'Looking for a courier',
        held: false,
      },
    ]

    const { rerender } = render(<AttentionList rows={rows} more={4} nowMs={nowMs} />)

    // 1 row + 4 more = 5 total
    expect(screen.getByText('Needs attention · 5')).toBeInTheDocument()
    expect(screen.getByText('and 4 more')).toBeInTheDocument()

    // When more is 0, the "and N more" text is absent
    rerender(<AttentionList rows={rows} more={0} nowMs={nowMs} />)
    expect(screen.getByText('Needs attention · 1')).toBeInTheDocument()
    expect(screen.queryByText(/and \d+ more/)).toBeNull()
  })

  it('draws red dot indicator for SOS and WAITING_FOR_RIDER, yellow for other kinds (AC-3)', () => {
    const rows: DispatchAttentionRowDto[] = [
      {
        id: 'r-sos',
        kind: 'SOS',
        since: '2026-11-09T14:25:00.000Z',
        deliveryId: null,
        sosId: 'sos-1',
        issueId: null,
        threadId: null,
        status: null,
        courierId: 'c-1',
        orderReference: null,
        restaurantName: null,
        riderName: 'Giorgos',
        customerLabel: null,
        detail: 'SOS: Giorgos pressed SOS',
        held: false,
      },
      {
        id: 'r-waiting',
        kind: 'WAITING_FOR_RIDER',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-w',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'W1',
        restaurantName: 'Pizza Mia',
        riderName: null,
        customerLabel: 'Maria',
        detail: 'Waiting for rider',
        held: false,
      },
      {
        id: 'r-late',
        kind: 'RESTAURANT_LATE',
        since: '2026-11-09T14:15:00.000Z',
        deliveryId: 'del-late',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.CourierArrivedAtPickupLocation,
        courierId: 'c-2',
        orderReference: 'L1',
        restaurantName: 'Burger House',
        riderName: 'Dimitris',
        customerLabel: 'John',
        detail: 'Dimitris waiting at Burger House, food was due 16:15',
        held: false,
      },
      {
        id: 'r-report',
        kind: 'RIDER_REPORT',
        since: '2026-11-09T14:22:00.000Z',
        deliveryId: 'del-rep',
        sosId: null,
        issueId: 'iss-1',
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.Dispatched,
        courierId: 'c-3',
        orderReference: 'REP1',
        restaurantName: 'Creperie',
        riderName: 'Kostas',
        customerLabel: 'Anna',
        detail: 'Kostas reported: Wrong address\nFlat 3C not found',
        held: false,
      },
    ]

    render(<AttentionList rows={rows} more={0} nowMs={nowMs} />)

    const renderedRows = screen.getAllByTestId('attention-row')
    expect(renderedRows).toHaveLength(4)

    // SOS has red dot: bg-destructive
    const sosDot = renderedRows[0].querySelector('span[aria-hidden="true"]')
    expect(sosDot).toHaveClass('bg-destructive')

    // WAITING_FOR_RIDER has red dot: bg-destructive
    const waitingDot = renderedRows[1].querySelector('span[aria-hidden="true"]')
    expect(waitingDot).toHaveClass('bg-destructive')

    // RESTAURANT_LATE has yellow dot: bg-warning
    const lateDot = renderedRows[2].querySelector('span[aria-hidden="true"]')
    expect(lateDot).toHaveClass('bg-warning')

    // RIDER_REPORT has yellow dot: bg-warning
    const reportDot = renderedRows[3].querySelector('span[aria-hidden="true"]')
    expect(reportDot).toHaveClass('bg-warning')
  })

  it('calculates and shows minutes from since for every row with since (AC-3)', () => {
    // nowMs is 14:30:00. 14:18:00 is 12 minutes ago.
    const row: DispatchAttentionRowDto = {
      id: 'r-minutes',
      kind: 'WAITING_FOR_RIDER',
      since: '2026-11-09T14:18:00.000Z',
      deliveryId: 'del-m',
      sosId: null,
      issueId: null,
      threadId: null,
      status: DeliveryAdminDtoStatusEnum.AssigningCourier,
      courierId: null,
      orderReference: 'M1',
      restaurantName: 'Taverna',
      riderName: null,
      customerLabel: 'Petros',
      detail: 'Waiting for rider',
      held: false,
    }

    render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

    expect(screen.getByText('· 12 min')).toBeInTheDocument()
  })

  describe('WAITING_FOR_RIDER and held deliveries (AC-4)', () => {
    it('renders customer and restaurant on second line, and provides Assign Courier button', () => {
      const row: DispatchAttentionRowDto = {
        id: 'r-waiting-detail',
        kind: 'WAITING_FOR_RIDER',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-w1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'ORD99',
        restaurantName: 'Gyros King',
        riderName: null,
        customerLabel: 'Yannis K.',
        detail: 'Looking for a courier',
        held: false,
      }

      render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

      // Reference and headline link
      const link = screen.getByRole('link', { name: /#ORD99 · Looking for a courier/ })
      expect(link).toHaveAttribute('href', '/deliveries/del-w1')

      // Second line with customer and restaurant
      expect(screen.getByText('Yannis K. · from Gyros King')).toBeInTheDocument()

      // Assign Courier button
      expect(screen.getByRole('button', { name: /Assign Courier/i })).toBeInTheDocument()
    })

    it('displays held delivery wording "Not offered yet, food ready HH:mm" (AC-4)', () => {
      const heldRow: DispatchAttentionRowDto = {
        id: 'r-held',
        kind: 'WAITING_FOR_RIDER',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-held',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'HELD1',
        restaurantName: 'Bakery',
        riderName: null,
        customerLabel: 'Eleni',
        detail: 'Not offered yet, food ready 16:45',
        held: true,
      }

      render(<AttentionList rows={[heldRow]} more={0} nowMs={nowMs} />)

      expect(screen.getByText(/#HELD1 · Not offered yet, food ready 16:45/)).toBeInTheDocument()
      expect(screen.getByText('Eleni · from Bakery')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Assign Courier/i })).toBeInTheDocument()
    })
  })

  describe('OFFER_UNANSWERED (AC-5)', () => {
    it('shows no minutes when since is null (running deadline / not timed)', () => {
      const rowNoMinutes: DispatchAttentionRowDto = {
        id: 'r-offer-null-since',
        kind: 'OFFER_UNANSWERED',
        since: null, // Spec AC-5: null since means offer deadline running -> no minutes shown
        deliveryId: 'del-off-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'OFF1',
        restaurantName: 'Grill',
        riderName: 'Stefanos',
        customerLabel: 'Takis',
        detail: 'Offered to Stefanos, unanswered',
        held: false,
      }

      render(<AttentionList rows={[rowNoMinutes]} more={0} nowMs={nowMs} />)

      expect(screen.getByText(/#OFF1 · Offered to Stefanos, unanswered/)).toBeInTheDocument()
      // No minutes span rendered
      expect(screen.queryByText(/· \d+ min/)).toBeNull()
      expect(screen.getByText('Takis · from Grill')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Assign Courier/i })).toBeInTheDocument()
    })

    it('shows minutes when since is populated (expired / no deadline)', () => {
      // 10 minutes ago
      const rowWithMinutes: DispatchAttentionRowDto = {
        id: 'r-offer-with-since',
        kind: 'OFFER_UNANSWERED',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-off-2',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: null,
        orderReference: 'OFF2',
        restaurantName: 'Grill',
        riderName: 'Stefanos',
        customerLabel: 'Takis',
        detail: 'Offered to Stefanos, unanswered',
        held: false,
      }

      render(<AttentionList rows={[rowWithMinutes]} more={0} nowMs={nowMs} />)

      expect(screen.getByText('· 10 min')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Assign Courier/i })).toBeInTheDocument()
    })
  })

  describe('RIDER_REPORT (AC-7)', () => {
    const reportRow: DispatchAttentionRowDto = {
      id: 'r-report-1',
      kind: 'RIDER_REPORT',
      since: '2026-11-09T14:25:00.000Z',
      deliveryId: 'del-rep-1',
      sosId: null,
      issueId: 'iss-99',
      threadId: null,
      status: DeliveryAdminDtoStatusEnum.Dispatched,
      courierId: 'c-5',
      orderReference: 'REP99',
      restaurantName: 'Cafe',
      riderName: 'Kostas',
      customerLabel: 'Maria',
      detail: 'Kostas reported: Wrong address\nDoorbell broken, customer not answering',
      held: false,
    }

    it('displays headline on first line and report note on its own second line', () => {
      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      // First line headline
      expect(screen.getByText(/#REP99 · Kostas reported: Wrong address/)).toBeInTheDocument()

      // Second line note
      const note = screen.getByText('Doorbell broken, customer not answering')
      expect(note).toBeInTheDocument()
      expect(note).toHaveClass('whitespace-pre-wrap')

      // Has both Open button and Mark Handled button
      expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/deliveries/del-rep-1')
      expect(screen.getByRole('button', { name: 'Mark Handled' })).toBeInTheDocument()
    })

    it('clicking Mark Handled sends deliveryId and issueId once', async () => {
      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      const markHandledBtn = screen.getByRole('button', { name: 'Mark Handled' })
      fireEvent.click(markHandledBtn)

      expect(mockMarkHandled).toHaveBeenCalledTimes(1)
      expect(mockMarkHandled).toHaveBeenCalledWith({
        deliveryId: 'del-rep-1',
        issueId: 'iss-99',
      })
      expect(mockMarkHandledUnwrap).toHaveBeenCalledTimes(1)
    })

    it('disables Mark Handled button while mutation isLoading is true', () => {
      mockUseMarkDeliveryIssueHandledMutation.mockReturnValue([mockMarkHandled, { isLoading: true }])

      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      const markHandledBtn = screen.getByRole('button', { name: 'Mark Handled' })
      expect(markHandledBtn).toBeDisabled()
    })

    it('shows destructive toast when markHandled fails', async () => {
      mockMarkHandledUnwrap.mockRejectedValueOnce(new Error('Server error'))

      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      const markHandledBtn = screen.getByRole('button', { name: 'Mark Handled' })
      fireEvent.click(markHandledBtn)

      // Allow promise rejection to propagate to try/catch
      await Promise.resolve()

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Could not mark the report handled',
        variant: 'destructive',
      })
    })
  })

  describe('SOS row (AC-8)', () => {
    it('links headline and Open button to /sos/<sosId>', () => {
      const sosRow: DispatchAttentionRowDto = {
        id: 'r-sos-row',
        kind: 'SOS',
        since: '2026-11-09T14:26:00.000Z',
        deliveryId: null,
        sosId: 'sos-incident-7',
        issueId: null,
        threadId: null,
        status: null,
        courierId: 'c-sos',
        orderReference: null,
        restaurantName: null,
        riderName: 'Giannis',
        customerLabel: null,
        detail: 'SOS: Giannis',
        held: false,
      }

      render(<AttentionList rows={[sosRow]} more={0} nowMs={nowMs} />)

      const headlineLink = screen.getByRole('link', { name: /SOS: Giannis/ })
      expect(headlineLink).toHaveAttribute('href', '/sos/sos-incident-7')

      const openBtn = screen.getByRole('link', { name: 'Open' })
      expect(openBtn).toHaveAttribute('href', '/sos/sos-incident-7')
    })
  })

  describe('Unknown kind (AC-9)', () => {
    it('draws a plain row with an Open button and does not throw', () => {
      const unknownRow: DispatchAttentionRowDto = {
        id: 'r-future',
        kind: 'UNREAD_MESSAGE',
        since: '2026-11-09T14:27:00.000Z',
        deliveryId: 'del-chat-1',
        sosId: null,
        issueId: null,
        threadId: 'th-1',
        status: DeliveryAdminDtoStatusEnum.Dispatched,
        courierId: 'c-chat',
        orderReference: 'CHAT1',
        restaurantName: 'Grill',
        riderName: 'Petros',
        customerLabel: 'Maria',
        detail: 'Petros sent: Running 5 min late',
        held: false,
      }

      expect(() => {
        render(<AttentionList rows={[unknownRow]} more={0} nowMs={nowMs} />)
      }).not.toThrow()

      expect(screen.getByText(/#CHAT1 · Petros sent: Running 5 min late/)).toBeInTheDocument()
      const openBtn = screen.getByRole('link', { name: 'Open' })
      expect(openBtn).toHaveAttribute('href', '/deliveries/del-chat-1')
    })
  })
})
