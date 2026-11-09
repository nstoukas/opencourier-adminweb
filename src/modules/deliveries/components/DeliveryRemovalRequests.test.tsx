import React from 'react'
import { render, screen } from '@testing-library/react'
import { DeliveryRemovalRequests } from './DeliveryRemovalRequests'
import { useGetDeliveryRemovalRequestsQuery } from '../../../api/removalRequestApi'
import { usePageVisible } from '../../../hooks/usePageVisible'
import {
  EnumRemovalRequestStatus,
  REMOVAL_REQUEST_STATUS_TO_HUMAN,
} from '../../../shared-types'
import type { RemovalRequestAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/removalRequestApi', () => ({
  useGetDeliveryRemovalRequestsQuery: jest.fn(),
}))

jest.mock('../../../hooks/usePageVisible', () => ({
  usePageVisible: jest.fn(),
}))

const mockUseGetDeliveryRemovalRequestsQuery = useGetDeliveryRemovalRequestsQuery as jest.Mock
const mockUsePageVisible = usePageVisible as jest.Mock

describe('DeliveryRemovalRequests (spec 0035, AC-24, AC-22)', () => {
  const baseRequest: RemovalRequestAdminDto = {
    id: 'req-1',
    courierId: 'courier-42',
    courierName: 'Katerina M.',
    label: 'Moped breakdown or accident',
    paidToRider: true,
    chargedToRestaurant: false,
    note: 'Engine died on the avenue',
    status: EnumRemovalRequestStatus.OPEN,
    createdAt: '2026-11-09T14:30:00.000Z',
    decidedAt: null,
    decidedBy: null,
    decisionNote: null,
    payAmount: null,
    payPolicy: null,
    afterPickup: false,
    settledAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
    mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
      currentData: [baseRequest],
      data: [baseRequest],
      isLoading: false,
      isError: false,
    })
  })

  describe('Loading, Error, and Empty states in words', () => {
    it('shows loading state in words when currentData is undefined', () => {
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: undefined,
        data: undefined,
        isLoading: true,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText('Loading removal requests.')).toBeInTheDocument()
      expect(screen.queryByText('No rider has asked to come off this delivery.')).toBeNull()
      expect(screen.queryByText('Could not load the removal requests.')).toBeNull()
    })

    it('shows empty state in words when requests list is empty', () => {
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [],
        data: [],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText('No rider has asked to come off this delivery.')).toBeInTheDocument()
      expect(screen.queryByText('Loading removal requests.')).toBeNull()
      expect(screen.queryByText('Could not load the removal requests.')).toBeNull()
    })

    it('shows error state in words when isError is true, beating old data and never showing empty text', () => {
      // isError beats old data: RTK Query keeps currentData after a failed poll of the same delivery
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [baseRequest],
        data: [baseRequest],
        isLoading: false,
        isError: true,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText('Could not load the removal requests.')).toBeInTheDocument()
      expect(screen.queryByTestId('removal-request-row')).toBeNull()
      expect(screen.queryByText('No rider has asked to come off this delivery.')).toBeNull()
      expect(screen.queryByText('Moped breakdown or accident (Paid)')).toBeNull()
    })
  })

  describe('Request item fields & decision display', () => {
    it('shows rider name, reason label, Paid/Not paid, note, and status words', () => {
      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      const row = screen.getByTestId('removal-request-row')
      expect(row).toHaveTextContent('Moped breakdown or accident (Paid)')
      expect(row).toHaveTextContent('From Katerina M.')
      expect(row).toHaveTextContent(REMOVAL_REQUEST_STATUS_TO_HUMAN.OPEN)
      expect(row).toHaveTextContent('Engine died on the avenue')
    })

    it('falls back to courierId when courierName is null or empty', () => {
      const requestWithoutName: RemovalRequestAdminDto = {
        ...baseRequest,
        courierName: '',
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [requestWithoutName],
        data: [requestWithoutName],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      const row = screen.getByTestId('removal-request-row')
      expect(row).toHaveTextContent('From courier-42')
    })

    it('shows Not paid when paidToRider is false', () => {
      const unpaidRequest: RemovalRequestAdminDto = {
        ...baseRequest,
        paidToRider: false,
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [unpaidRequest],
        data: [unpaidRequest],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText(/Moped breakdown or accident \(Not paid\)/)).toBeInTheDocument()
    })

    it('asserts every one of the five statuses in words from REMOVAL_REQUEST_STATUS_TO_HUMAN', () => {
      const statuses: EnumRemovalRequestStatus[] = [
        EnumRemovalRequestStatus.OPEN,
        EnumRemovalRequestStatus.APPROVED,
        EnumRemovalRequestStatus.DECLINED,
        EnumRemovalRequestStatus.WITHDRAWN,
        EnumRemovalRequestStatus.CLOSED,
      ]

      for (const status of statuses) {
        const req: RemovalRequestAdminDto = {
          ...baseRequest,
          id: `req-${status}`,
          status,
          decidedAt: null,
          decidedBy: null,
        }

        mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
          currentData: [req],
          data: [req],
          isLoading: false,
          isError: false,
        })

        const { unmount } = render(<DeliveryRemovalRequests deliveryId="del-100" />)
        const expectedWords = REMOVAL_REQUEST_STATUS_TO_HUMAN[status]
        expect(screen.getByText(`· ${expectedWords}`)).toBeInTheDocument()
        unmount()
      }
    })

    it('displays who decided and when for APPROVED with username', () => {
      const approvedRequest: RemovalRequestAdminDto = {
        ...baseRequest,
        status: EnumRemovalRequestStatus.APPROVED,
        decidedAt: '2026-11-09T14:45:00.000Z',
        decidedBy: { id: 'u1', username: 'alex', email: 'alex@coop.gr' },
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [approvedRequest],
        data: [approvedRequest],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      // In Athens time (UTC+2) 14:45 UTC is 16:45
      expect(screen.getByText(/Approved by alex at 16:45/)).toBeInTheDocument()
    })

    it('displays who decided with email when decidedBy has only email, and refusal sentence on DECLINED', () => {
      const declinedRequest: RemovalRequestAdminDto = {
        ...baseRequest,
        status: EnumRemovalRequestStatus.DECLINED,
        decidedAt: '2026-11-09T14:45:00.000Z',
        decidedBy: { id: 'u1', username: '', email: 'dispatcher@coop.gr' },
        decisionNote: 'Food is already on the bike, please complete delivery',
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [declinedRequest],
        data: [declinedRequest],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText(/Declined by dispatcher@coop.gr at 16:45/)).toBeInTheDocument()
      expect(
        screen.getByText(/Food is already on the bike, please complete delivery/)
      ).toBeInTheDocument()
    })

    it('falls back to "an admin" when decidedBy is missing on APPROVED or DECLINED', () => {
      const noUserRequest: RemovalRequestAdminDto = {
        ...baseRequest,
        status: EnumRemovalRequestStatus.APPROVED,
        decidedAt: '2026-11-09T14:45:00.000Z',
        decidedBy: null,
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [noUserRequest],
        data: [noUserRequest],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(screen.getByText(/Approved by an admin at 16:45/)).toBeInTheDocument()
    })

    it('NEVER shows who decided on WITHDRAWN or CLOSED even if decidedAt is populated', () => {
      const withdrawnWithDecided: RemovalRequestAdminDto = {
        ...baseRequest,
        status: EnumRemovalRequestStatus.WITHDRAWN,
        decidedAt: '2026-11-09T14:45:00.000Z',
        decidedBy: { id: 'u1', username: 'admin1', email: 'admin@coop.gr' },
      }
      const closedWithDecided: RemovalRequestAdminDto = {
        ...baseRequest,
        status: EnumRemovalRequestStatus.CLOSED,
        decidedAt: '2026-11-09T14:45:00.000Z',
        decidedBy: { id: 'u1', username: 'admin1', email: 'admin@coop.gr' },
      }

      for (const req of [withdrawnWithDecided, closedWithDecided]) {
        mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
          currentData: [req],
          data: [req],
          isLoading: false,
          isError: false,
        })

        const { unmount } = render(<DeliveryRemovalRequests deliveryId="del-100" />)
        expect(screen.queryByText(/Approved by/)).toBeNull()
        expect(screen.queryByText(/Declined by/)).toBeNull()
        expect(screen.queryByText(/by admin1/)).toBeNull()
        unmount()
      }
    })

    it('shows an unknown status exactly as sent', () => {
      const unknownStatusRequest: RemovalRequestAdminDto = {
        ...baseRequest,
        status: 'ESCALATED' as any,
      }
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: [unknownStatusRequest],
        data: [unknownStatusRequest],
        isLoading: false,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      const row = screen.getByTestId('removal-request-row')
      expect(row).toHaveTextContent('· ESCALATED')
    })
  })

  describe('currentData vs data isolation (AC-24)', () => {
    it('reads currentData rather than data so navigating between deliveries never shows previous delivery data', () => {
      // Simulate navigating to a new delivery:
      // RTK Query keeps `data` from previous query while `currentData` is undefined for the new query
      mockUseGetDeliveryRemovalRequestsQuery.mockReturnValue({
        currentData: undefined,
        data: [baseRequest],
        isLoading: true,
        isError: false,
      })

      render(<DeliveryRemovalRequests deliveryId="del-200" />)

      // Must show loading and NOT previous delivery's requests!
      expect(screen.getByText('Loading removal requests.')).toBeInTheDocument()
      expect(screen.queryByTestId('removal-request-row')).toBeNull()
      expect(screen.queryByText('Moped breakdown or accident (Paid)')).toBeNull()
    })
  })

  describe('Polling interval and page visibility (AC-24)', () => {
    it('polls at 30,000 ms when page is visible and 0 when tab is hidden', () => {
      mockUsePageVisible.mockReturnValue(true)
      const { rerender } = render(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(mockUseGetDeliveryRemovalRequestsQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-100' },
        { skip: false, pollingInterval: 30_000 }
      )

      // Tab hidden
      mockUsePageVisible.mockReturnValue(false)
      rerender(<DeliveryRemovalRequests deliveryId="del-100" />)

      expect(mockUseGetDeliveryRemovalRequestsQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-100' },
        { skip: false, pollingInterval: 0 }
      )
    })
  })

  describe('Value 5 admin-side guard (AC-22)', () => {
    it('shows no count, sum, or total for a rider, and lists requests strictly per delivery', () => {
      render(<DeliveryRemovalRequests deliveryId="del-100" />)

      const card = screen.getByText('Removal requests').closest('.rounded-lg')
      expect(card).not.toBeNull()

      // The card header has only "Removal requests" with no count like "(1)" or "Total: 1"
      expect(screen.getByText('Removal requests').textContent).toBe('Removal requests')

      // Read each element's own text, check without word boundary after preceding text,
      // and refuse numbers followed by request/requests
      const elements = card ? Array.from(card.querySelectorAll('*')) : []
      const cardTextWithSpaces = elements.map((el) => el.textContent || '').join(' ')
      const rawCardText = card?.textContent ?? ''

      // 1. Refuse aggregation keywords (total, count, sum, score, rank, rate), dropping leading boundary
      expect(rawCardText).not.toMatch(/(?:total|count|sum|score|rank|rate)\b/i)
      expect(cardTextWithSpaces).not.toMatch(/\b(?:total|count|sum|score|rank|rate)\b/i)

      for (const el of elements) {
        const text = el.textContent || ''
        expect(text).not.toMatch(/(?:total|count|sum|score|rank|rate)\b/i)
        // 2. Refuse a number followed by request or requests
        expect(text).not.toMatch(/\d+\s*(?:removal\s*)?requests?\b/i)
      }

      // Also refuse on combined card text
      expect(cardTextWithSpaces).not.toMatch(/\d+\s*(?:removal\s*)?requests?\b/i)
      expect(rawCardText).not.toMatch(/\brequests?\s*\(\d+\)/i)
    })
  })
})
