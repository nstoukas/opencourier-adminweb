import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ApproveRemovalButton, DeclineRemovalButton } from './RemovalRequestActions'
import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'
import {
  useApproveRemovalRequestMutation,
  useDeclineRemovalRequestMutation,
} from '../../api/removalRequestApi'
import { useToast } from '../../admin-web-components'

jest.mock('../../api/removalRequestApi', () => ({
  useApproveRemovalRequestMutation: jest.fn(),
  useDeclineRemovalRequestMutation: jest.fn(),
}))

jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: jest.fn(),
  }
})

const mockUseApproveRemovalRequestMutation = useApproveRemovalRequestMutation as jest.Mock
const mockUseDeclineRemovalRequestMutation = useDeclineRemovalRequestMutation as jest.Mock
const mockUseToast = useToast as jest.Mock

const mockApprove = jest.fn()
const mockDecline = jest.fn()
const mockToast = jest.fn()

const baseRow: DispatchAttentionRowDto = {
  id: 'att-1',
  kind: 'REMOVAL_REQUEST',
  since: '2026-11-09T14:00:00.000Z',
  deliveryId: 'del-100',
  orderReference: 'ORD-99',
  restaurantName: 'Volos Grill',
  customerLabel: 'Maria K.',
  detail: 'Food already picked up: approving cancels the order\nMoped broke down, cannot deliver',
  sosId: null,
  issueId: null,
  threadId: null,
  status: null,
  courierId: 'courier-1',
  riderName: 'Nikos P.',
  held: false,
  removalRequestId: 'rem-1',
  pickedUp: false,
}

const resolved = (value: unknown = {}) => ({ unwrap: () => Promise.resolve(value) })
const rejected = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

describe('RemovalRequestActions (spec 0035, AC-6, decisions 24.28, 24.30)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseToast.mockReturnValue({ toast: mockToast })
    mockUseApproveRemovalRequestMutation.mockReturnValue([mockApprove, { isLoading: false }])
    mockUseDeclineRemovalRequestMutation.mockReturnValue([mockDecline, { isLoading: false }])
    mockApprove.mockReturnValue(resolved({ status: 'APPROVED', deliveryStatus: 'ASSIGNING_COURIER' }))
    mockDecline.mockReturnValue(resolved({ status: 'DECLINED' }))
  })

  describe('ApproveRemovalButton (AC-6, decision 24.28)', () => {
    it('is ONE click with no confirmation dialog, sending removalRequestId and pickedUp: false when not picked up', async () => {
      render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: false }} />)

      const button = screen.getByRole('button', { name: 'Approve' })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith({ id: 'rem-1', pickedUp: false })
      })

      // No confirmation dialog was opened
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByRole('alertdialog')).toBeNull()
    })

    it('sends pickedUp: true when row.pickedUp is true', async () => {
      render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: true }} />)

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith({ id: 'rem-1', pickedUp: true })
      })
    })

    it('pins pickedUp: false when row.pickedUp is undefined or missing', async () => {
      const rowWithoutPickedUp = { ...baseRow }
      delete (rowWithoutPickedUp as any).pickedUp

      render(<ApproveRemovalButton row={rowWithoutPickedUp} />)

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith({ id: 'rem-1', pickedUp: false })
      })
    })

    it('decision 24.28: button is red (bg-destructive) ONLY when pickedUp is true, otherwise default variant', () => {
      // 1. When pickedUp is true: variant is destructive (has bg-destructive class)
      const { rerender } = render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: true }} />)
      const redBtn = screen.getByRole('button', { name: 'Approve' })
      expect(redBtn.className).toContain('bg-destructive')

      // 2. When pickedUp is false: variant is default (not bg-destructive)
      rerender(<ApproveRemovalButton row={{ ...baseRow, pickedUp: false }} />)
      const defaultBtn = screen.getByRole('button', { name: 'Approve' })
      expect(defaultBtn.className).not.toContain('bg-destructive')
    })

    it('disables the button after successful approve, and toasts rider is off order when deliveryStatus is not CANCELED', async () => {
      mockApprove.mockReturnValue(resolved({ status: 'APPROVED', deliveryStatus: 'ASSIGNING_COURIER' }))

      render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: false }} />)

      const button = screen.getByRole('button', { name: 'Approve' })
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Approved',
        description: 'The rider is off the order. It is offered again once the food is due.',
      })
    })

    it('toasts order is cancelled when deliveryStatus is CANCELED', async () => {
      mockApprove.mockReturnValue(resolved({ status: 'APPROVED', deliveryStatus: 'CANCELED' }))

      render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: true }} />)

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Approved',
          description: 'The order is cancelled. The rider says whether the food went back.',
        })
      })
    })

    it('sends nothing when removalRequestId is missing', () => {
      const rowWithoutId = { ...baseRow, removalRequestId: undefined }

      render(<ApproveRemovalButton row={rowWithoutId} />)

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

      expect(mockApprove).not.toHaveBeenCalled()
    })

    it('shows destructive toast with backend sentence on 409 conflict, and button remains enabled', async () => {
      mockApprove.mockReturnValue(
        rejected({ statusCode: 409, message: 'The delivery was already picked up by the rider' })
      )

      render(<ApproveRemovalButton row={{ ...baseRow, pickedUp: false }} />)

      const button = screen.getByRole('button', { name: 'Approve' })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Not approved',
          description: 'The delivery was already picked up by the rider',
          variant: 'destructive',
        })
      })

      // Crucial: The button is not left disabled by an error
      expect(button).not.toBeDisabled()
    })
  })

  describe('DeclineRemovalButton (AC-6, AC-7, decision 24.30)', () => {
    it('opens dialog with optional sentence textarea having maxLength 500', () => {
      render(<DeclineRemovalButton row={baseRow} />)

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Decline this request' })).toBeInTheDocument()
      expect(screen.getByText('Nikos P. stays on the order and can ask again.')).toBeInTheDocument()

      const textarea = document.getElementById(`decline-note-${baseRow.id}`) as HTMLTextAreaElement
      expect(textarea).toBeInTheDocument()
      expect(textarea.maxLength).toBe(500)
    })

    it('sends sentence trimmed when non-empty', async () => {
      render(<DeclineRemovalButton row={baseRow} />)

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      const textarea = document.getElementById(`decline-note-${baseRow.id}`) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '   Please wait 5 more minutes   ' } })

      const submitBtn = screen.getByRole('button', { name: 'Decline' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockDecline).toHaveBeenCalledWith({
          id: 'rem-1',
          note: 'Please wait 5 more minutes',
        })
      })

      // Dialog closes and Decline button becomes disabled
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled()
    })

    it('sends empty or spaces-only sentence as undefined', async () => {
      render(<DeclineRemovalButton row={baseRow} />)

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      const textarea = document.getElementById(`decline-note-${baseRow.id}`) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '     ' } })

      const submitBtn = screen.getByRole('button', { name: 'Decline' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockDecline).toHaveBeenCalledWith({
          id: 'rem-1',
          note: undefined,
        })
      })
    })

    it('decision 24.30: a 409 conflict on decline closes the dialog and shows a toast, never in-dialog message', async () => {
      mockDecline.mockReturnValue(
        rejected({ statusCode: 409, message: 'This request was already decided by another dispatcher' })
      )

      render(<DeclineRemovalButton row={baseRow} />)

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      const submitBtn = screen.getByRole('button', { name: 'Decline' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Not declined',
          description: 'This request was already decided by another dispatcher',
          variant: 'destructive',
        })
      })

      // Dialog is closed
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('any other error (not 409) stays in the dialog as an alert and sends NO toast', async () => {
      mockDecline.mockReturnValue(
        rejected({ statusCode: 500, message: 'Internal server error while declining' })
      )

      render(<DeclineRemovalButton row={baseRow} />)

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      const submitBtn = screen.getByRole('button', { name: 'Decline' })
      fireEvent.click(submitBtn)

      // Dialog stays open and shows error alert
      expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error while declining')
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // No toast is sent!
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('with no removalRequestId, pressing Decline in the dialog never calls decline', () => {
      const rowWithoutId: DispatchAttentionRowDto = { ...baseRow, removalRequestId: undefined }
      render(<DeclineRemovalButton row={rowWithoutId} />)

      // Open the dialog
      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // The dialog footer has a Decline submit button
      const dialog = screen.getByRole('dialog')
      const submitBtn = within(dialog).getByRole('button', { name: 'Decline' })
      fireEvent.click(submitBtn)

      expect(mockDecline).not.toHaveBeenCalled()
    })
  })
})
