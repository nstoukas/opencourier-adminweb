import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

jest.mock('../../api/removalRequestApi', () => ({
  useApproveRemovalRequestMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
  useDeclineRemovalRequestMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
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
    const sosDot = renderedRows[0]?.querySelector('span[aria-hidden="true"]')
    expect(sosDot).toHaveClass('bg-destructive')

    // WAITING_FOR_RIDER has red dot: bg-destructive
    const waitingDot = renderedRows[1]?.querySelector('span[aria-hidden="true"]')
    expect(waitingDot).toHaveClass('bg-destructive')

    // RESTAURANT_LATE has yellow dot: bg-warning
    const lateDot = renderedRows[2]?.querySelector('span[aria-hidden="true"]')
    expect(lateDot).toHaveClass('bg-warning')

    // RIDER_REPORT has yellow dot: bg-warning
    const reportDot = renderedRows[3]?.querySelector('span[aria-hidden="true"]')
    expect(reportDot).toHaveClass('bg-warning')
  })

  it('renders hidden text "Nobody has taken this." for each red row and "Running." for each yellow row', () => {
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

    // Red rows (SOS, WAITING_FOR_RIDER) have hidden text "Nobody has taken this."
    const sosRow = renderedRows[0] as HTMLElement
    const waitingRow = renderedRows[1] as HTMLElement
    expect(sosRow.querySelector('.sr-only')).toHaveTextContent('Nobody has taken this.')
    expect(waitingRow.querySelector('.sr-only')).toHaveTextContent('Nobody has taken this.')

    // Yellow rows (RESTAURANT_LATE, RIDER_REPORT) have hidden text "Running."
    const lateRow = renderedRows[2] as HTMLElement
    const reportRow = renderedRows[3] as HTMLElement
    expect(lateRow.querySelector('.sr-only')).toHaveTextContent('Running.')
    expect(reportRow.querySelector('.sr-only')).toHaveTextContent('Running.')
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
      await act(async () => {
        fireEvent.click(markHandledBtn)
        await Promise.resolve()
      })

      expect(mockMarkHandled).toHaveBeenCalledTimes(1)
      expect(mockMarkHandled).toHaveBeenCalledWith({
        deliveryId: 'del-rep-1',
        issueId: 'iss-99',
      })
      expect(mockMarkHandledUnwrap).toHaveBeenCalledTimes(1)
    })

    it('after a successful Mark Handled the button is disabled while the row stays, and a second click sends nothing', async () => {
      mockMarkHandledUnwrap.mockResolvedValueOnce({})

      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      const markHandledBtn = screen.getByRole('button', { name: 'Mark Handled' })
      expect(markHandledBtn).toBeEnabled()

      // First click: triggers markHandled mutation and sets saved state
      await act(async () => {
        fireEvent.click(markHandledBtn)
        await Promise.resolve()
      })

      expect(mockMarkHandled).toHaveBeenCalledTimes(1)
      expect(mockMarkHandled).toHaveBeenCalledWith({
        deliveryId: 'del-rep-1',
        issueId: 'iss-99',
      })

      // The button is disabled while the row stays on screen
      expect(markHandledBtn).toBeDisabled()
      expect(screen.getByText(/#REP99 · Kostas reported: Wrong address/)).toBeInTheDocument()

      // A second click sends nothing
      await act(async () => {
        fireEvent.click(markHandledBtn)
        await Promise.resolve()
      })

      expect(mockMarkHandled).toHaveBeenCalledTimes(1)
    })

    it('after a failed Mark Handled the button is enabled again', async () => {
      mockMarkHandledUnwrap.mockRejectedValueOnce(new Error('Server error'))

      render(<AttentionList rows={[reportRow]} more={0} nowMs={nowMs} />)

      const markHandledBtn = screen.getByRole('button', { name: 'Mark Handled' })
      expect(markHandledBtn).toBeEnabled()

      await act(async () => {
        fireEvent.click(markHandledBtn)
        await Promise.resolve()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Could not mark the report handled',
        variant: 'destructive',
      })

      // Button is enabled again after failure
      expect(markHandledBtn).toBeEnabled()
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
      await act(async () => {
        fireEvent.click(markHandledBtn)
        await Promise.resolve()
      })

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
        kind: 'FUTURE_UNKNOWN_KIND' as any,
        since: '2026-11-09T14:27:00.000Z',
        deliveryId: 'del-chat-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.Dispatched,
        courierId: 'c-chat',
        orderReference: 'CHAT1',
        restaurantName: 'Grill',
        riderName: 'Petros',
        customerLabel: 'Maria',
        detail: 'Future event occurred',
        held: false,
      }

      expect(() => {
        render(<AttentionList rows={[unknownRow]} more={0} nowMs={nowMs} />)
      }).not.toThrow()

      expect(screen.getByText(/#CHAT1 · Future event occurred/)).toBeInTheDocument()
      const openBtn = screen.getByRole('link', { name: 'Open' })
      expect(openBtn).toHaveAttribute('href', '/deliveries/del-chat-1')
    })
  })

  describe('UNREAD_MESSAGE row (spec 0034, AC-17)', () => {
    const unreadMessageRow: DispatchAttentionRowDto = {
      id: 'r-chat-unread-1',
      kind: 'UNREAD_MESSAGE',
      since: '2026-11-09T14:20:00.000Z',
      deliveryId: 'del-chat-1',
      sosId: null,
      issueId: null,
      threadId: 'thread-xyz-789',
      status: DeliveryAdminDtoStatusEnum.Dispatched,
      courierId: 'c-chat',
      orderReference: 'CHAT42',
      restaurantName: 'Souvlaki House',
      riderName: 'Petros',
      customerLabel: 'Maria',
      detail: 'Petros sent: Running 5 min late',
      held: false,
    }

    it('draws dot as yellow (bg-warning, sr-only "Running.", never bg-destructive or "Nobody has taken this.")', () => {
      render(<AttentionList rows={[unreadMessageRow]} more={0} nowMs={nowMs} />)

      const rowElement = screen.getByTestId('attention-row')
      const dot = rowElement.querySelector('span[aria-hidden="true"]')
      expect(dot?.className).toContain('bg-warning')
      expect(dot?.className).not.toContain('bg-destructive')

      expect(rowElement).toHaveTextContent('Running.')
      expect(rowElement).not.toHaveTextContent('Nobody has taken this.')
    })

    it('draws an "Open Chat" link to /chat/<threadId>', () => {
      render(<AttentionList rows={[unreadMessageRow]} more={0} nowMs={nowMs} />)

      const openChatLink = screen.getByRole('link', { name: 'Open Chat' })
      expect(openChatLink).toBeInTheDocument()
      expect(openChatLink).toHaveAttribute('href', '/chat/thread-xyz-789')
    })

    it('rowHref and headline link go to /chat/<threadId> when threadId is set', () => {
      render(<AttentionList rows={[unreadMessageRow]} more={0} nowMs={nowMs} />)

      const headlineLink = screen.getByRole('link', {
        name: /#CHAT42 · Petros sent: Running 5 min late/,
      })
      expect(headlineLink).toHaveAttribute('href', '/chat/thread-xyz-789')
    })
  })

  describe('Removal request row (spec 0035, AC-6)', () => {
    const removalRow: DispatchAttentionRowDto = {
      id: 'r-removal-1',
      kind: 'REMOVAL_REQUEST',
      since: '2026-11-09T14:25:00.000Z',
      deliveryId: 'del-rem-1',
      sosId: null,
      issueId: null,
      threadId: null,
      status: DeliveryAdminDtoStatusEnum.Dispatched,
      courierId: 'courier-42',
      orderReference: 'REM42',
      restaurantName: 'Souvlaki Bar',
      riderName: 'Giorgos K.',
      customerLabel: 'Eleni P.',
      detail: 'Food already picked up: approving cancels the order\nMoped broke down, cannot finish the delivery',
      held: false,
      removalRequestId: 'rem-req-1',
      pickedUp: true,
    }

    it('draws row dot as yellow (bg-warning, words "Running.", never red bg-destructive)', () => {
      render(<AttentionList rows={[removalRow]} more={0} nowMs={nowMs} />)

      const rowElement = screen.getByTestId('attention-row')
      const dot = rowElement.querySelector('span[aria-hidden="true"]')
      expect(dot?.className).toContain('bg-warning')
      expect(dot?.className).not.toContain('bg-destructive')

      expect(rowElement).toHaveTextContent('Running.')
      expect(rowElement).not.toHaveTextContent('Nobody has taken this.')
    })

    it('draws detail whole: first line as headline, rider note as second line, including approving cancels order wording', () => {
      render(<AttentionList rows={[removalRow]} more={0} nowMs={nowMs} />)

      // First line / headline inside link
      expect(
        screen.getByRole('link', {
          name: /#REM42 · Food already picked up: approving cancels the order/,
        })
      ).toBeInTheDocument()

      // Second line with rider's note
      expect(
        screen.getByText('Moped broke down, cannot finish the delivery')
      ).toBeInTheDocument()
    })

    it('offers Open, Decline and Approve buttons on REMOVAL_REQUEST', () => {
      render(<AttentionList rows={[removalRow]} more={0} nowMs={nowMs} />)

      expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    })

    it('no other kind offers Approve or Decline buttons', () => {
      const otherRows: DispatchAttentionRowDto[] = [
        {
          id: 'r-waiting',
          kind: 'WAITING_FOR_RIDER',
          since: '2026-11-09T14:20:00.000Z',
          deliveryId: 'del-1',
          sosId: null,
          issueId: null,
          threadId: null,
          status: DeliveryAdminDtoStatusEnum.AssigningCourier,
          courierId: null,
          orderReference: 'W1',
          restaurantName: 'Grill',
          riderName: null,
          customerLabel: 'Cust',
          detail: 'No courier',
          held: false,
        },
        {
          id: 'r-report',
          kind: 'RIDER_REPORT',
          since: '2026-11-09T14:22:00.000Z',
          deliveryId: 'del-2',
          sosId: null,
          issueId: 'iss-1',
          threadId: null,
          status: DeliveryAdminDtoStatusEnum.Dispatched,
          courierId: 'c1',
          orderReference: 'REP1',
          restaurantName: 'Pizza',
          riderName: 'Rider',
          customerLabel: 'Cust2',
          detail: 'Wrong item reported',
          held: false,
        },
        {
          id: 'r-sos',
          kind: 'SOS',
          since: '2026-11-09T14:24:00.000Z',
          deliveryId: null,
          sosId: 'sos-1',
          issueId: null,
          threadId: null,
          status: null,
          courierId: 'c2',
          orderReference: null,
          restaurantName: null,
          riderName: 'Rider2',
          customerLabel: null,
          detail: 'SOS alert',
          held: false,
        },
      ]

      render(<AttentionList rows={otherRows} more={0} nowMs={nowMs} />)

      expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
    })
  })

  describe('Paired delivery indication (spec 0048, AC-12)', () => {
    const pairedDeliveryId = 'del-partner-222222'

    it('renders "Two orders together, with #REF · shortId" when pairedDeliveryId and pairedOrderReference are present', () => {
      const row: DispatchAttentionRowDto = {
        id: 'r-paired',
        kind: 'OFFER_UNANSWERED',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: 'c1',
        orderReference: 'REF1',
        restaurantName: 'Souvlaki Bar',
        riderName: 'Nikos',
        customerLabel: 'Maria P.',
        detail: 'Offered to Nikos',
        held: false,
        pairedDeliveryId,
        pairedOrderReference: 'REF2',
      }

      render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

      const pairNotice = screen.getByTestId('attention-pair')
      expect(pairNotice).toBeInTheDocument()
      expect(pairNotice).toHaveTextContent('Two orders together, with #REF2 · 222222')

      const link = within(pairNotice).getByRole('link', { name: '#REF2 · 222222' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', `/deliveries/${pairedDeliveryId}`)
      expect(link).toHaveAttribute('title', pairedDeliveryId)
    })

    it('renders "Two orders together, with delivery shortId" when pairedOrderReference is null', () => {
      const row: DispatchAttentionRowDto = {
        id: 'r-paired-noref',
        kind: 'OFFER_UNANSWERED',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: 'c1',
        orderReference: 'REF1',
        restaurantName: 'Souvlaki Bar',
        riderName: 'Nikos',
        customerLabel: 'Maria P.',
        detail: 'Offered to Nikos',
        held: false,
        pairedDeliveryId,
        pairedOrderReference: null,
      }

      render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

      const pairNotice = screen.getByTestId('attention-pair')
      expect(pairNotice).toBeInTheDocument()
      expect(pairNotice).toHaveTextContent('Two orders together, with delivery 222222')

      const link = within(pairNotice).getByRole('link', { name: 'delivery 222222' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', `/deliveries/${pairedDeliveryId}`)
      expect(link).toHaveAttribute('title', pairedDeliveryId)
    })

    it('renders "Two orders together, with delivery shortId" when pairedOrderReference is empty string', () => {
      const row: DispatchAttentionRowDto = {
        id: 'r-paired-emptyref',
        kind: 'OFFER_UNANSWERED',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: 'c1',
        orderReference: 'REF1',
        restaurantName: 'Souvlaki Bar',
        riderName: 'Nikos',
        customerLabel: 'Maria P.',
        detail: 'Offered to Nikos',
        held: false,
        pairedDeliveryId,
        pairedOrderReference: '',
      }

      render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

      const pairNotice = screen.getByTestId('attention-pair')
      expect(pairNotice).toBeInTheDocument()
      expect(pairNotice).toHaveTextContent('Two orders together, with delivery 222222')

      const link = within(pairNotice).getByRole('link', { name: 'delivery 222222' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', `/deliveries/${pairedDeliveryId}`)
      expect(link).toHaveAttribute('title', pairedDeliveryId)
    })

    it('does not render attention-pair when pairedDeliveryId is absent or null', () => {
      const row: DispatchAttentionRowDto = {
        id: 'r-single',
        kind: 'OFFER_UNANSWERED',
        since: '2026-11-09T14:20:00.000Z',
        deliveryId: 'del-1',
        sosId: null,
        issueId: null,
        threadId: null,
        status: DeliveryAdminDtoStatusEnum.AssigningCourier,
        courierId: 'c1',
        orderReference: 'REF1',
        restaurantName: 'Souvlaki Bar',
        riderName: 'Nikos',
        customerLabel: 'Maria P.',
        detail: 'Offered to Nikos',
        held: false,
      }

      render(<AttentionList rows={[row]} more={0} nowMs={nowMs} />)

      expect(screen.queryByTestId('attention-pair')).toBeNull()
    })
  })
})
