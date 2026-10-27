import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { DeliveryIssues } from './DeliveryIssues'
import { useGetDeliveryIssuesQuery } from '../../../api/deliveriesApi'
import { usePageVisible } from '../../../hooks/usePageVisible'
import { formatDate } from '../../../ui-shared-utils'
import type { DeliveryIssueAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/deliveriesApi', () => ({
  useGetDeliveryIssuesQuery: jest.fn(),
}))

jest.mock('../../../hooks/usePageVisible', () => ({
  usePageVisible: jest.fn(),
}))

const mockUseGetDeliveryIssuesQuery = useGetDeliveryIssuesQuery as jest.Mock
const mockUsePageVisible = usePageVisible as jest.Mock

describe('DeliveryIssues component (decision 66.11)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
  })

  describe('Loading, error, and empty states (Contract 3)', () => {
    it('renders loading text while loading', () => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(screen.getByText('Loading rider reports.')).toBeInTheDocument()
      expect(screen.queryByTestId('delivery-issue-row')).toBeNull()
    })

    it('renders "Could not load the rider reports." on error', () => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: 'Network error' },
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(screen.getByText('Could not load the rider reports.')).toBeInTheDocument()
      expect(screen.queryByTestId('delivery-issue-row')).toBeNull()
    })

    it('renders "Could not load the rider reports." when query error object is present', () => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: { status: 500, data: 'Server failure' },
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(screen.getByText('Could not load the rider reports.')).toBeInTheDocument()
    })

    it('renders "No rider has reported an issue with this delivery." for an empty list', () => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(
        screen.getByText('No rider has reported an issue with this delivery.')
      ).toBeInTheDocument()
      expect(screen.queryByTestId('delivery-issue-row')).toBeNull()
    })

    it('renders "No rider has reported an issue with this delivery." when data is null/undefined without error or loading', () => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(
        screen.getByText('No rider has reported an issue with this delivery.')
      ).toBeInTheDocument()
    })
  })

  describe('Report rows rendering (Contract 3)', () => {
    const mockReports: DeliveryIssueAdminDto[] = [
      {
        id: 'issue-1',
        reason: 'WRONG_ADDRESS',
        note: 'Customer specified Apt 4B but building only goes up to floor 3',
        createdAt: new Date('2026-10-27T10:14:00.000Z'),
        courierId: 'courier-1',
        courierName: 'Testing Courier',
      },
      {
        id: 'issue-2',
        reason: 'NO_SIGNAL',
        note: null,
        createdAt: new Date('2026-10-27T10:18:00.000Z'),
        courierId: 'courier-2',
        courierName: 'Second Courier',
      },
      {
        id: 'issue-3',
        reason: 'NEW_UNRECOGNIZED_REASON',
        note: 'Some unexpected note',
        createdAt: new Date('2026-10-27T10:22:00.000Z'),
        courierId: 'courier-3',
        courierName: '', // Empty name triggers courierId fallback
      },
    ]

    beforeEach(() => {
      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: mockReports,
        isLoading: false,
        isError: false,
        error: null,
      })
    })

    it('renders one data-testid=delivery-issue-row per report in the order given', () => {
      render(<DeliveryIssues deliveryId="d100" />)

      const rows = screen.getAllByTestId('delivery-issue-row')
      expect(rows).toHaveLength(3)

      // Verify order matches input list
      expect(within(rows[0]!).getByText('Wrong address')).toBeInTheDocument()
      expect(within(rows[1]!).getByText('No internet, GPS or signal')).toBeInTheDocument()
      expect(within(rows[2]!).getByText('NEW_UNRECOGNIZED_REASON')).toBeInTheDocument()
    })

    it('renders humanized reason words from DELIVERY_ISSUE_REASON_TO_HUMAN and shows unknown reasons as sent', () => {
      render(<DeliveryIssues deliveryId="d100" />)

      const rows = screen.getAllByTestId('delivery-issue-row')

      // Known reasons map to friendly Greek-co-op admin text
      expect(within(rows[0]!).getByText('Wrong address')).toBeInTheDocument()
      expect(within(rows[1]!).getByText('No internet, GPS or signal')).toBeInTheDocument()

      // Unknown reason rendered raw as sent by the backend
      expect(within(rows[2]!).getByText('NEW_UNRECOGNIZED_REASON')).toBeInTheDocument()
    })

    it('renders courierName when present, and falls back to courierId when courierName is empty', () => {
      render(<DeliveryIssues deliveryId="d100" />)

      const rows = screen.getAllByTestId('delivery-issue-row')

      // Row 0 has courierName 'Testing Courier'
      expect(within(rows[0]!).getByText('Testing Courier')).toBeInTheDocument()
      expect(within(rows[0]!).getByText('From')).toBeInTheDocument()

      // Row 2 has empty courierName, so falls back to courierId 'courier-3'
      expect(within(rows[2]!).getByText('courier-3')).toBeInTheDocument()
      expect(within(rows[2]!).getByText('From')).toBeInTheDocument()
    })

    it('renders the formatted time using formatDate', () => {
      render(<DeliveryIssues deliveryId="d100" />)

      const rows = screen.getAllByTestId('delivery-issue-row')

      expect(within(rows[0]!).getByText(formatDate(mockReports[0]!.createdAt))).toBeInTheDocument()
      expect(within(rows[1]!).getByText(formatDate(mockReports[1]!.createdAt))).toBeInTheDocument()
      expect(within(rows[2]!).getByText(formatDate(mockReports[2]!.createdAt))).toBeInTheDocument()
    })

    it('renders the note only when there is one and omits note container when null/empty', () => {
      render(<DeliveryIssues deliveryId="d100" />)

      const rows = screen.getAllByTestId('delivery-issue-row')

      // Row 0 has note
      expect(
        within(rows[0]!).getByText('Customer specified Apt 4B but building only goes up to floor 3')
      ).toBeInTheDocument()

      // Row 1 has null note, so no paragraph is rendered
      expect(rows[1]!.querySelectorAll('p')).toHaveLength(0)

      // Row 2 has note
      expect(within(rows[2]!).getByText('Some unexpected note')).toBeInTheDocument()
    })

    it('renders ORDER_HANDED and OTHER human labels correctly', () => {
      const remainingReasons: DeliveryIssueAdminDto[] = [
        {
          id: 'issue-4',
          reason: 'ORDER_HANDED',
          note: null,
          createdAt: new Date('2026-10-27T10:25:00.000Z'),
          courierId: 'courier-4',
          courierName: 'Courier Four',
        },
        {
          id: 'issue-5',
          reason: 'OTHER',
          note: 'Customer requested delayed handoff',
          createdAt: new Date('2026-10-27T10:26:00.000Z'),
          courierId: 'courier-5',
          courierName: 'Courier Five',
        },
      ]

      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: remainingReasons,
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryIssues deliveryId="d100" />)

      expect(screen.getByText('Order handed to the customer')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })
  })

  describe('Polling and query options (Contract 4)', () => {
    it('polls every 30000 ms while the page is visible and 0 ms when hidden', () => {
      mockUsePageVisible.mockReturnValue(true)
      mockUseGetDeliveryIssuesQuery.mockReturnValue({ data: [], isLoading: false })

      const { rerender } = render(<DeliveryIssues deliveryId="del-456" />)

      // Visible: polling interval is 30,000 ms
      expect(mockUseGetDeliveryIssuesQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-456' },
        { skip: false, pollingInterval: 30_000 }
      )

      // Tab hidden in background: polling interval drops to 0 (no polling)
      mockUsePageVisible.mockReturnValue(false)
      rerender(<DeliveryIssues deliveryId="del-456" />)

      expect(mockUseGetDeliveryIssuesQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-456' },
        { skip: false, pollingInterval: 0 }
      )
    })

    it('skips query execution when deliveryId is empty', () => {
      mockUsePageVisible.mockReturnValue(true)
      mockUseGetDeliveryIssuesQuery.mockReturnValue({ data: undefined, isLoading: false })

      render(<DeliveryIssues deliveryId="" />)

      expect(mockUseGetDeliveryIssuesQuery).toHaveBeenCalledWith(
        { deliveryId: '' },
        { skip: true, pollingInterval: 30_000 }
      )
    })
  })

  describe('Value 5 / anti-gamification rule (Contract 6)', () => {
    it('does not render a count of reports in the title or anywhere in the card', () => {
      // Value 5: Never display a report count like "Rider reports (2)" or a count badge.
      const twoReports: DeliveryIssueAdminDto[] = [
        {
          id: 'i-1',
          reason: 'WRONG_ADDRESS',
          note: null,
          createdAt: new Date('2026-10-27T10:00:00Z'),
          courierId: 'c1',
          courierName: 'Rider 1',
        },
        {
          id: 'i-2',
          reason: 'NO_SIGNAL',
          note: null,
          createdAt: new Date('2026-10-27T10:05:00Z'),
          courierId: 'c2',
          courierName: 'Rider 2',
        },
      ]

      mockUseGetDeliveryIssuesQuery.mockReturnValue({
        data: twoReports,
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryIssues deliveryId="d100" />)

      // Title must be exact string "Rider reports" without any count or parentheses
      const title = screen.getByText('Rider reports')
      expect(title.textContent).toBe('Rider reports')
      expect(screen.queryByText(/Rider reports\s*\(/i)).toBeNull()
      expect(screen.queryByText(/\b2\s+reports?\b/i)).toBeNull()
    })
  })
})
