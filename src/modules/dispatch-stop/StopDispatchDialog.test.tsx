import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StopDispatchDialog } from './StopDispatchDialog'
import { athensToday } from './dispatchStopDisplay'

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockCreateStopMutation = jest.fn()
const mockUseCreateDispatchStopMutation = jest.fn()
const mockUseGetDispatchStopPreviewQuery = jest.fn()

jest.mock('../../api/dispatchStopApi', () => ({
  useCreateDispatchStopMutation: () => mockUseCreateDispatchStopMutation(),
  useGetDispatchStopPreviewQuery: (arg: unknown, options: unknown) =>
    mockUseGetDispatchStopPreviewQuery(arg, options),
}))

describe('StopDispatchDialog (spec 0014, AC-1, AC-2, AC-9, AC-12)', () => {
  const mockOnOpenChange = jest.fn()
  const returnFocusTo = { current: document.createElement('button') }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreateDispatchStopMutation.mockReturnValue([
      mockCreateStopMutation,
      { isLoading: false },
    ])
    mockUseGetDispatchStopPreviewQuery.mockReturnValue({
      data: {
        offersToEnd: 2,
        deliveriesToReturn: 3,
      },
      isLoading: false,
    })
  })

  describe('Stop now mode (AC-1, AC-9)', () => {
    it('shows preview counts note with plural words when counts are > 1', () => {
      mockUseGetDispatchStopPreviewQuery.mockReturnValue({
        data: { offersToEnd: 2, deliveriesToReturn: 3 },
        isLoading: false,
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      const note = screen.getByRole('note')
      expect(note).toHaveTextContent(
        "This ends 2 open offers and sends 3 deliveries not yet picked up back to waiting. Riders who lose a delivery are paid by the co-op's reassignment setting."
      )
    })

    it('shows preview counts note with singular words when counts are 1', () => {
      mockUseGetDispatchStopPreviewQuery.mockReturnValue({
        data: { offersToEnd: 1, deliveriesToReturn: 1 },
        isLoading: false,
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      const note = screen.getByRole('note')
      expect(note).toHaveTextContent(
        "This ends 1 open offer and sends 1 delivery not yet picked up back to waiting. Riders who lose a delivery are paid by the co-op's reassignment setting."
      )
    })

    it('shows loading placeholder when preview query has not resolved yet', () => {
      mockUseGetDispatchStopPreviewQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      expect(
        screen.getByText('Counting open offers and deliveries not yet picked up…')
      ).toBeInTheDocument()
    })

    it('sends { reason } with NO startsOn and NO endsOn when end time is unchecked', async () => {
      mockCreateStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'stop-new-1' }),
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      // Reason defaults to HEAT; change to STORM
      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'STORM' } })

      // Check that "Set an end time" checkbox is unchecked
      const hasEndCheckbox = screen.getByLabelText(
        'Set an end time (otherwise until you restart)'
      ) as HTMLInputElement
      expect(hasEndCheckbox.checked).toBe(false)

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Stop dispatch' }))

      await waitFor(() => {
        expect(mockCreateStopMutation).toHaveBeenCalledWith({
          reason: 'STORM',
        })
      })

      expect(mockToast).toHaveBeenCalledWith({ title: 'Dispatch is stopped.' })
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('sends endsOn only when "Set an end time" is checked, and never sends startsOn', async () => {
      mockCreateStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'stop-new-2' }),
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      // Check "Set an end time"
      const hasEndCheckbox = screen.getByLabelText('Set an end time (otherwise until you restart)')
      fireEvent.click(hasEndCheckbox)

      // Fill in end date and time
      fireEvent.change(screen.getByLabelText('Ends on'), { target: { value: '2026-11-05' } })
      fireEvent.change(screen.getByLabelText('At'), { target: { value: '16:00' } })

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Stop dispatch' }))

      await waitFor(() => {
        expect(mockCreateStopMutation).toHaveBeenCalledWith({
          reason: 'HEAT',
          endsOn: { date: '2026-11-05', time: '16:00' },
        })
      })

      // Ensure startsOn was NOT sent
      const payload = mockCreateStopMutation.mock.calls[0]?.[0]
      expect(payload).not.toHaveProperty('startsOn')

      expect(mockToast).toHaveBeenCalledWith({ title: 'Dispatch is stopped.' })
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Schedule mode (AC-2)', () => {
    it('does not display preview note and skips preview query in schedule mode', () => {
      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="schedule"
          returnFocusTo={returnFocusTo}
        />
      )

      expect(screen.queryByRole('note')).not.toBeInTheDocument()
      expect(mockUseGetDispatchStopPreviewQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ skip: true })
      )
    })

    it('sends startsOn and endsOn as { date, time } in Athens time', async () => {
      mockCreateStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'stop-sched-1' }),
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="schedule"
          returnFocusTo={returnFocusTo}
        />
      )

      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'HEAT' } })
      fireEvent.change(screen.getByLabelText('Starts on'), { target: { value: '2026-07-20' } })
      fireEvent.change(screen.getByLabelText('At', { selector: '#stop-start-time' }), {
        target: { value: '12:00' },
      })
      fireEvent.change(screen.getByLabelText('Ends on'), { target: { value: '2026-07-20' } })
      fireEvent.change(screen.getByLabelText('At', { selector: '#stop-end-time' }), {
        target: { value: '17:00' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Schedule stop' }))

      await waitFor(() => {
        expect(mockCreateStopMutation).toHaveBeenCalledWith({
          reason: 'HEAT',
          startsOn: { date: '2026-07-20', time: '12:00' },
          endsOn: { date: '2026-07-20', time: '17:00' },
        })
      })

      expect(mockToast).toHaveBeenCalledWith({ title: 'The stop is scheduled.' })
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('initializes startsOn and endsOn defaults with athensToday() and standard hours (12:00 to 17:00)', () => {
      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="schedule"
          returnFocusTo={returnFocusTo}
        />
      )

      const today = athensToday()
      expect(screen.getByLabelText('Starts on')).toHaveValue(today)
      expect(screen.getByLabelText('At', { selector: '#stop-start-time' })).toHaveValue('12:00')
      expect(screen.getByLabelText('Ends on')).toHaveValue(today)
      expect(screen.getByLabelText('At', { selector: '#stop-end-time' })).toHaveValue('17:00')
    })
  })

  describe('error handling and loading state', () => {
    it('shows backend refusal sentence when createStop mutation fails and keeps dialog open', async () => {
      mockCreateStopMutation.mockReturnValue({
        unwrap: () =>
          Promise.reject({
            message: 'Another dispatch stop already covers part of that time.',
          }),
      })

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Stop dispatch' }))

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent(
          'Another dispatch stop already covers part of that time.'
        )
      })

      expect(mockToast).not.toHaveBeenCalled()
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('submit button is disabled while loading and dialog cannot be closed', () => {
      mockUseCreateDispatchStopMutation.mockReturnValue([
        mockCreateStopMutation,
        { isLoading: true },
      ])

      render(
        <StopDispatchDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="now"
          returnFocusTo={returnFocusTo}
        />
      )

      const submitBtn = screen.getByRole('button', { name: /stop dispatch/i })
      expect(submitBtn).toBeDisabled()

      // Cancel button disabled
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      expect(cancelBtn).toBeDisabled()
    })
  })

  describe('focus management on close (AC-12)', () => {
    it('returns focus to opening button after closing', async () => {
      function Harness() {
        const [open, setOpen] = React.useState(true)
        const buttonRef = React.useRef<HTMLButtonElement>(null)
        return (
          <div>
            <button ref={buttonRef} type="button">
              Stop now button
            </button>
            <StopDispatchDialog
              open={open}
              onOpenChange={setOpen}
              mode="now"
              returnFocusTo={buttonRef}
            />
          </div>
        )
      }

      render(<Harness />)
      const triggerBtn = screen.getByRole('button', { name: 'Stop now button', hidden: true })

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(triggerBtn)
      })
    })
  })
})
