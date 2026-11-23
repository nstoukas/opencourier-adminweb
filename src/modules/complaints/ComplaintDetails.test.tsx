import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ComplaintDetails } from './ComplaintDetails'
import type { ComplaintAdminDto } from '@/backend-admin-sdk'
import {
  useGetComplaintQuery,
  useDecideComplaintMutation,
  useWithdrawComplaintMutation,
  useReplyForRiderMutation,
} from '@/api/complaintApi'

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    let resolvedHref = href
    if (typeof href === 'object' && href !== null) {
      let path = href.pathname || ''
      const query = href.query || {}
      for (const [key, value] of Object.entries(query)) {
        path = path.replace(`[${key}]`, String(value))
      }
      resolvedHref = path
    }
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    )
  }
})

// Mock ComplaintPhoto
jest.mock('./ComplaintPhoto', () => ({
  ComplaintPhoto: ({ complaintId }: { complaintId: string }) => (
    <div data-testid={`complaint-photo-${complaintId}`}>Mock Photo Component</div>
  ),
}))

// Mock API hooks
jest.mock('../../api/complaintApi', () => ({
  useGetComplaintQuery: jest.fn(),
  useDecideComplaintMutation: jest.fn(),
  useWithdrawComplaintMutation: jest.fn(),
  useReplyForRiderMutation: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockUseGetComplaintQuery = useGetComplaintQuery as jest.Mock
const mockUseDecideComplaintMutation = useDecideComplaintMutation as jest.Mock
const mockUseWithdrawComplaintMutation = useWithdrawComplaintMutation as jest.Mock
const mockUseReplyForRiderMutation = useReplyForRiderMutation as jest.Mock

describe('ComplaintDetails (spec 0052, AC-1, AC-5, AC-6, AC-7, AC-10; cross check 2)', () => {
  const mockDecide = jest.fn()
  const mockWithdraw = jest.fn()
  const mockReplyForRider = jest.fn()

  const baseComplaintAboutRider: ComplaintAdminDto = {
    id: 'cmp-201',
    delivery: { id: 'del-201', pickupName: 'Taverna Ouzeri', createdAt: '2026-11-20T12:00:00Z' },
    filedBy: 'RESTAURANT',
    filerName: 'Nikos Manager',
    filerCourierId: null,
    filerPartnerId: 'p-1',
    about: 'RIDER',
    aboutCourierId: 'c-33',
    aboutCourierName: 'Panos Moped',
    aboutCourierDeactivated: false,
    category: 'FOOD_DAMAGED',
    text: 'Soup spilled inside the food bag.',
    hasPhoto: false,
    status: 'AWAITING_REPLY',
    createdAt: '2026-11-20T12:30:00Z',
    riderReply: null,
    repliedAt: null,
    replyEnteredBy: null,
    replyEnteredForRider: false,
    outcome: null,
    decidedAt: null,
    decidedBy: null,
    withdrawnReason: null,
    withdrawnAt: null,
    withdrawnBy: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDecideComplaintMutation.mockReturnValue([mockDecide, { isLoading: false }])
    mockUseWithdrawComplaintMutation.mockReturnValue([mockWithdraw, { isLoading: false }])
    mockUseReplyForRiderMutation.mockReturnValue([mockReplyForRider, { isLoading: false }])
  })

  it('renders loading state initially', () => {
    mockUseGetComplaintQuery.mockReturnValue({ currentData: undefined, isError: false })
    render(<ComplaintDetails complaintId="cmp-201" />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Complaint' })).toBeInTheDocument()
  })

  it('renders error state when complaint fails to load', () => {
    mockUseGetComplaintQuery.mockReturnValue({ currentData: undefined, isError: true })
    render(<ComplaintDetails complaintId="cmp-unknown" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The complaint could not be loaded.')
  })

  describe('Complaint about a rider awaiting reply (AC-3, AC-4, AC-5)', () => {
    beforeEach(() => {
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: baseComplaintAboutRider,
        isError: false,
      })
    })

    it('renders complaint heading, back link, details, and message', () => {
      render(<ComplaintDetails complaintId="cmp-201" />)

      expect(screen.getByRole('heading', { level: 1, name: 'Complaint: Food damaged' })).toBeInTheDocument()
      expect(screen.getAllByText("Waiting for the rider's reply").length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('link', { name: 'All complaints' })).toHaveAttribute('href', '/complaints')

      // "The complaint" card
      const complaintCard = screen.getByTestId('complaint-text')
      expect(within(complaintCard).getByText('Soup spilled inside the food bag.')).toBeInTheDocument()
      expect(within(complaintCard).queryByTestId('complaint-photo-cmp-201')).toBeNull()

      // "Details" card
      const riderLink = screen.getByRole('link', { name: /Panos Moped/ })
      expect(riderLink).toHaveAttribute('href', '/couriers/c-33')
      expect(screen.getByRole('link', { name: /Taverna Ouzeri/ })).toHaveAttribute('href', '/deliveries/del-201')
    })

    it('shows waiting message in rider reply card while reply is pending (AC-4)', () => {
      render(<ComplaintDetails complaintId="cmp-201" />)

      const replyCard = screen.getByTestId('complaint-reply')
      expect(
        within(replyCard).getByText(/Waiting for the rider's reply\. The rider was told in the app/)
      ).toBeInTheDocument()
    })

    it('disables "Record the decision" button and textarea while awaiting reply (AC-5 gate)', () => {
      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      const outcomeTextarea = within(decideCard).getByLabelText('Outcome')
      const decideButton = within(decideCard).getByRole('button', { name: 'Record the decision' })

      expect(outcomeTextarea).toBeDisabled()
      expect(decideButton).toBeDisabled()
      expect(
        within(decideCard).getByText(/Waiting for the rider's reply: a decision can be recorded once they have replied\./)
      ).toBeInTheDocument()
    })

    it('allows withdrawing complaint at any time with a reason (AC-5, cross check 6)', async () => {
      mockWithdraw.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'cmp-201', status: 'WITHDRAWN' }),
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      const withdrawOpenButton = within(decideCard).getByRole('button', { name: 'Withdraw…' })
      fireEvent.click(withdrawOpenButton)

      // The withdrawal form appears
      const reasonInput = within(decideCard).getByLabelText('Why it is withdrawn')
      const withdrawButton = within(decideCard).getByRole('button', { name: 'Withdraw the complaint' })

      fireEvent.change(reasonInput, { target: { value: 'Restaurant discovered soup was packaged loosely.' } })

      // Clicking "Withdraw the complaint" opens confirmation dialog (row 83 review: value 4)
      fireEvent.click(withdrawButton)

      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText('Withdraw this complaint?')).toBeInTheDocument()
      expect(
        within(dialog).getByText(
          'It closes with no finding against anyone, and it cannot be reopened. The reason is shown to the rider and to whoever filed it.'
        )
      ).toBeInTheDocument()

      // Cancelling the dialog keeps the complaint open and does not call withdraw
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(mockWithdraw).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).toBeNull()

      // Clicking withdraw again and confirming in dialog calls the API
      fireEvent.click(withdrawButton)
      const confirmDialog = screen.getByRole('alertdialog')
      fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Withdraw the complaint' }))

      await waitFor(() => {
        expect(mockWithdraw).toHaveBeenCalledWith({
          id: 'cmp-201',
          reason: 'Restaurant discovered soup was packaged loosely.',
        })
        expect(mockToast).toHaveBeenCalledWith({ title: 'Complaint withdrawn.' })
      })
    })
  })

  describe('Deactivated rider reply by admin on phone (cross check 2)', () => {
    it('renders "Enter the reply for the rider" form when rider is deactivated and awaiting reply', async () => {
      const deactivatedRiderComplaint: ComplaintAdminDto = {
        ...baseComplaintAboutRider,
        aboutCourierDeactivated: true,
      }
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: deactivatedRiderComplaint,
        isError: false,
      })
      mockReplyForRider.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'cmp-201', status: 'OPEN' }),
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const replyCard = screen.getByTestId('complaint-reply')
      expect(
        within(replyCard).getByText(/The rider's account is deactivated, so they cannot reply in the app\./)
      ).toBeInTheDocument()

      const replyInput = within(replyCard).getByLabelText('Enter the reply for the rider')
      const quickFillButton = within(replyCard).getByRole('button', { name: 'The rider could not reply' })

      // Click quick-fill button
      fireEvent.click(quickFillButton)
      expect(replyInput).toHaveValue('The rider could not reply.')

      // Click Save the reply
      const saveReplyButton = within(replyCard).getByRole('button', { name: 'Save the reply' })
      fireEvent.click(saveReplyButton)

      await waitFor(() => {
        expect(mockReplyForRider).toHaveBeenCalledWith({
          id: 'cmp-201',
          text: 'The rider could not reply.',
        })
        expect(mockToast).toHaveBeenCalledWith({ title: 'Reply saved.' })
      })
    })

    it('does NOT render reply entry form when rider is active (must reply in app)', () => {
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: { ...baseComplaintAboutRider, aboutCourierDeactivated: false },
        isError: false,
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const replyCard = screen.getByTestId('complaint-reply')
      expect(within(replyCard).queryByLabelText('Enter the reply for the rider')).toBeNull()
    })
  })

  describe('Open complaint ready for decision (AC-5, AC-6)', () => {
    const openComplaintWithReply: ComplaintAdminDto = {
      ...baseComplaintAboutRider,
      status: 'OPEN',
      riderReply: 'The lid was already loose when the restaurant gave it to me.',
      repliedAt: '2026-11-20T13:00:00Z',
      replyEnteredBy: null,
      hasPhoto: true,
    }

    beforeEach(() => {
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: openComplaintWithReply,
        isError: false,
      })
    })

    it('renders rider reply from app and attached photo component (AC-4, AC-9)', () => {
      render(<ComplaintDetails complaintId="cmp-201" />)

      // Photo component is rendered
      expect(screen.getByTestId('complaint-photo-cmp-201')).toBeInTheDocument()

      // Reply is displayed
      const replyCard = screen.getByTestId('complaint-reply')
      expect(
        within(replyCard).getByText('The lid was already loose when the restaurant gave it to me.')
      ).toBeInTheDocument()
      expect(within(replyCard).getByText(/From the rider, in the app/)).toBeInTheDocument()
    })

    it('enables decision recording once status is OPEN, and saves outcome (AC-5, AC-6)', async () => {
      mockDecide.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'cmp-201', status: 'DECIDED', outcome: 'No fault found.' }),
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      const outcomeTextarea = within(decideCard).getByLabelText('Outcome')
      const decideButton = within(decideCard).getByRole('button', { name: 'Record the decision' })

      expect(outcomeTextarea).toBeEnabled()
      expect(decideButton).toBeDisabled() // disabled while empty

      fireEvent.change(outcomeTextarea, { target: { value: 'Packaging issue noted; no deduction from rider.' } })
      expect(decideButton).toBeEnabled()

      // Clicking "Record the decision" opens confirmation dialog (row 83 review: value 4)
      fireEvent.click(decideButton)

      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText('Record this decision?')).toBeInTheDocument()
      // Base complaint filedBy is 'RESTAURANT', so description names both rider and filer
      expect(
        within(dialog).getByText('The rider and whoever filed it will see it, and it cannot be changed.')
      ).toBeInTheDocument()

      // Cancelling the dialog leaves complaint undecided
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(mockDecide).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).toBeNull()

      // Clicking record again and confirming calls the API
      fireEvent.click(decideButton)
      const confirmDialog = screen.getByRole('alertdialog')
      fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Record the decision' }))

      await waitFor(() => {
        expect(mockDecide).toHaveBeenCalledWith({
          id: 'cmp-201',
          outcome: 'Packaging issue noted; no deduction from rider.',
        })
        expect(mockToast).toHaveBeenCalledWith({ title: 'Decision recorded.' })
      })
    })

    it('shows rider-specific confirmation dialog text when deciding a complaint filed by a rider', async () => {
      const riderFiledComplaint: ComplaintAdminDto = {
        ...openComplaintWithReply,
        filedBy: 'RIDER',
        filerCourierId: 'c-10',
        about: 'RESTAURANT',
        aboutCourierId: null,
      }
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: riderFiledComplaint,
        isError: false,
      })
      mockDecide.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'cmp-201', status: 'DECIDED', outcome: 'Resolved.' }),
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      const outcomeTextarea = within(decideCard).getByLabelText('Outcome')
      const decideButton = within(decideCard).getByRole('button', { name: 'Record the decision' })

      fireEvent.change(outcomeTextarea, { target: { value: 'Restaurant contacted regarding wait times.' } })
      fireEvent.click(decideButton)

      const dialog = screen.getByRole('alertdialog')
      expect(
        within(dialog).getByText('The rider who filed it will see it, and it cannot be changed.')
      ).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Record the decision' }))

      await waitFor(() => {
        expect(mockDecide).toHaveBeenCalledWith({
          id: 'cmp-201',
          outcome: 'Restaurant contacted regarding wait times.',
        })
      })
    })
  })

  describe('Decided and Withdrawn status cards (AC-6, AC-10)', () => {
    it('renders recorded outcome, decidedAt, and decidedBy for DECIDED complaint', () => {
      const decidedComplaint: ComplaintAdminDto = {
        ...baseComplaintAboutRider,
        status: 'DECIDED',
        riderReply: 'Reply text',
        repliedAt: '2026-11-20T13:00:00Z',
        outcome: 'Warning issued to restaurant regarding fragile soup containers.',
        decidedAt: '2026-11-20T15:00:00Z',
        decidedBy: 'Admin Maria',
      }
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: decidedComplaint,
        isError: false,
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      expect(
        within(decideCard).getByText('Warning issued to restaurant regarding fragile soup containers.')
      ).toBeInTheDocument()
      expect(within(decideCard).getByText(/Decided .* by Admin Maria/)).toBeInTheDocument()
      // Form should not be rendered
      expect(within(decideCard).queryByRole('button', { name: 'Record the decision' })).toBeNull()
    })

    it('renders withdrawal text, reason, and admin for WITHDRAWN complaint', () => {
      const withdrawnComplaint: ComplaintAdminDto = {
        ...baseComplaintAboutRider,
        status: 'WITHDRAWN',
        withdrawnReason: 'Accidentally submitted wrong order.',
        withdrawnAt: '2026-11-20T14:00:00Z',
        withdrawnBy: 'Admin Giorgos',
      }
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: withdrawnComplaint,
        isError: false,
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      const decideCard = screen.getByTestId('complaint-decision')
      expect(within(decideCard).getByText('Withdrawn, with no finding against anyone.')).toBeInTheDocument()
      expect(within(decideCard).getByText('Accidentally submitted wrong order.')).toBeInTheDocument()
      expect(within(decideCard).getByText(/Withdrawn .* by Admin Giorgos/)).toBeInTheDocument()
    })
  })

  describe('Complaint about a Restaurant or Customer (cross check 5)', () => {
    it('does NOT render rider reply card for complaints about a restaurant', () => {
      const restaurantComplaint: ComplaintAdminDto = {
        ...baseComplaintAboutRider,
        about: 'RESTAURANT',
        aboutCourierId: null,
        aboutCourierName: null,
        status: 'OPEN',
      }
      mockUseGetComplaintQuery.mockReturnValue({
        currentData: restaurantComplaint,
        isError: false,
      })

      render(<ComplaintDetails complaintId="cmp-201" />)

      expect(screen.queryByTestId('complaint-reply')).toBeNull()
    })
  })
})
