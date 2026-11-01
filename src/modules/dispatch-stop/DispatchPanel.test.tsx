import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DispatchPanel } from './DispatchPanel'
import type { DispatchStopAdminDto } from '../../backend-admin-sdk'

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockUsePageVisible = jest.fn()
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockUsePageVisible(),
}))

const mockUseGetDispatchStopsQuery = jest.fn()
const mockEndStopMutation = jest.fn()
const mockUseEndDispatchStopMutation = jest.fn()
jest.mock('../../api/dispatchStopApi', () => ({
  useGetDispatchStopsQuery: (arg: unknown, options: unknown) =>
    mockUseGetDispatchStopsQuery(arg, options),
  useEndDispatchStopMutation: () => mockUseEndDispatchStopMutation(),
}))

let mockDialogPropsHistory: Array<{
  open: boolean
  mode: 'now' | 'schedule'
  returnFocusTo: React.RefObject<HTMLButtonElement | null>
}> = []

jest.mock('./StopDispatchDialog', () => ({
  StopDispatchDialog: ({
    open,
    onOpenChange,
    mode,
    returnFocusTo,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'now' | 'schedule'
    returnFocusTo: React.RefObject<HTMLButtonElement | null>
  }) => {
    mockDialogPropsHistory.push({ open, mode, returnFocusTo })

    // Simulate Radix dialog exit: when closing begins, content stays rendered until unmountAutoFocus
    const [isClosing, setIsClosing] = React.useState(false)

    React.useEffect(() => {
      if (!open && isClosing) {
        // Radix executes onCloseAutoFocus during the unmount animation
        returnFocusTo.current?.focus()
        setIsClosing(false)
      }
    }, [open, isClosing, returnFocusTo])

    if (!open && !isClosing) return null

    return (
      <div role="dialog" aria-modal="true" data-testid="mock-stop-dialog" data-mode={mode}>
        <h2>{mode === 'now' ? 'Stop dispatch now' : 'Schedule a stop'}</h2>
        <button
          type="button"
          onClick={() => {
            setIsClosing(true)
            onOpenChange(false)
          }}
        >
          Close dialog
        </button>
      </div>
    )
  },
}))

describe('DispatchPanel (spec 0014, AC-3, AC-8, AC-9)', () => {
  const sampleActiveStop: DispatchStopAdminDto = {
    id: 'stop-active-1',
    reason: 'HEAT',
    startsAt: '2026-07-15T09:00:00Z',
    endsAt: '2026-07-15T15:00:00Z',
    createdByUserId: 'usr-admin-123456',
    createdAt: '2026-07-15T08:50:00Z',
    startedAt: '2026-07-15T09:00:00Z',
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  const sampleScheduledStop1: DispatchStopAdminDto = {
    id: 'stop-sched-1',
    reason: 'STORM',
    startsAt: '2026-07-16T10:00:00Z',
    endsAt: '2026-07-16T14:00:00Z',
    createdByUserId: 'usr-admin-654321',
    createdAt: '2026-07-15T10:00:00Z',
    startedAt: null,
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  const sampleScheduledStop2: DispatchStopAdminDto = {
    id: 'stop-sched-2',
    reason: 'HEAT',
    startsAt: '2026-07-17T09:00:00Z',
    endsAt: '2026-07-17T14:00:00Z',
    createdByUserId: 'usr-admin-789012',
    createdAt: '2026-07-15T10:00:00Z',
    startedAt: null,
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDialogPropsHistory = []
    mockUsePageVisible.mockReturnValue(true)
    mockUseEndDispatchStopMutation.mockReturnValue([
      mockEndStopMutation,
      { isLoading: false },
    ])
    mockUseGetDispatchStopsQuery.mockReturnValue({
      data: {
        current: null,
        scheduled: [],
        history: [],
      },
      isLoading: false,
      isError: false,
    })
  })

  describe('polling behavior (AC-9, decision 61.52)', () => {
    it('polls every 30000 ms while the page is visible', () => {
      mockUsePageVisible.mockReturnValue(true)
      render(<DispatchPanel />)

      expect(mockUseGetDispatchStopsQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ pollingInterval: 30000 })
      )
    })

    it('stops polling (pollingInterval: 0) while the page is hidden', () => {
      mockUsePageVisible.mockReturnValue(false)
      render(<DispatchPanel />)

      expect(mockUseGetDispatchStopsQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ pollingInterval: 0 })
      )
    })
  })

  describe('loading and error states', () => {
    it('shows loading indicator when overview query is loading', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })
      render(<DispatchPanel />)
      expect(screen.getByText('Loading dispatch…')).toBeInTheDocument()
    })

    it('shows error message when overview query has an error', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      })
      render(<DispatchPanel />)
      expect(screen.getByText('Could not load whether dispatch is stopped.')).toBeInTheDocument()
    })
  })

  describe('dispatch status display', () => {
    it('shows "Dispatch is on." and Stop now button when no stop is active', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      expect(screen.getByText('Dispatch is on.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Stop now' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Schedule a stop' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Restart now' })).not.toBeInTheDocument()
    })

    it('shows only the time when the end is today in Athens', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-07-15T10:00:00Z'))
      try {
        mockUseGetDispatchStopsQuery.mockReturnValue({
          data: { current: sampleActiveStop, scheduled: [], history: [] },
          isLoading: false,
          isError: false,
        })
        render(<DispatchPanel />)

        // 15:00 UTC on July 15 is 18:00 Athens time today
        expect(
          screen.getByText(/Dispatch is stopped until 18:00 \(Heat\)\./i)
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Restart now' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Stop now' })).not.toBeInTheDocument()
      } finally {
        jest.useRealTimers()
      }
    })

    it('shows the date and time when the end is another day in Athens', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-07-15T10:00:00Z'))
      try {
        const tomorrowStop: DispatchStopAdminDto = {
          ...sampleActiveStop,
          endsAt: '2026-07-16T15:00:00Z',
        }
        mockUseGetDispatchStopsQuery.mockReturnValue({
          data: { current: tomorrowStop, scheduled: [], history: [] },
          isLoading: false,
          isError: false,
        })
        render(<DispatchPanel />)

        // July 16 is tomorrow in Athens
        expect(
          screen.getByText(/Dispatch is stopped until Thu 16 Jul, 18:00 \(Heat\)\./i)
        ).toBeInTheDocument()
      } finally {
        jest.useRealTimers()
      }
    })

    it('shows "Dispatch is stopped until you restart it (<Reason>)." when an indefinite stop is active', () => {
      const indefiniteStop: DispatchStopAdminDto = {
        ...sampleActiveStop,
        endsAt: null,
        reason: 'OTHER',
      }
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: indefiniteStop, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      expect(
        screen.getByText(/Dispatch is stopped until you restart it \(Other\)\./i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Restart now' })).toBeInTheDocument()
    })
  })

  describe('Restart now action (AC-3)', () => {
    it('calls end mutation with current stop id and shows success toast', async () => {
      mockEndStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve(sampleActiveStop),
      })
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: sampleActiveStop, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'Restart now' }))

      await waitFor(() => {
        expect(mockEndStopMutation).toHaveBeenCalledWith({ id: sampleActiveStop.id })
      })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Dispatch is on again.',
      })
    })

    it('shows destructive toast when restart mutation fails', async () => {
      mockEndStopMutation.mockReturnValue({
        unwrap: () => Promise.reject({ message: 'Stop has already ended.' }),
      })
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: sampleActiveStop, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'Restart now' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Stop has already ended.',
          variant: 'destructive',
        })
      })
    })
  })

  describe('scheduled stop display and Cancel it action (AC-2)', () => {
    it('lists every scheduled stop, each with its own Cancel button (aria-label "Cancel the stop on <date>")', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: {
          current: null,
          scheduled: [sampleScheduledStop1, sampleScheduledStop2],
          history: [],
        },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      // 10:00 UTC July 16 is Thu 16 Jul, 13:00 Athens; 14:00 UTC is 17:00 Athens
      expect(
        screen.getByText(/Scheduled: Thu 16 Jul, 13:00 to 17:00 \(Storm\)\./i)
      ).toBeInTheDocument()

      // 09:00 UTC July 17 is Fri 17 Jul, 12:00 Athens; 14:00 UTC is 17:00 Athens
      expect(
        screen.getByText(/Scheduled: Fri 17 Jul, 12:00 to 17:00 \(Heat\)\./i)
      ).toBeInTheDocument()

      const stop1CancelBtn = screen.getByRole('button', {
        name: 'Cancel the stop on Thu 16 Jul, 13:00',
      })
      const stop2CancelBtn = screen.getByRole('button', {
        name: 'Cancel the stop on Fri 17 Jul, 12:00',
      })
      expect(stop1CancelBtn).toBeInTheDocument()
      expect(stop2CancelBtn).toBeInTheDocument()
    })

    it('clicking each Cancel button calls end mutation with that stop id', async () => {
      mockEndStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve(sampleScheduledStop2),
      })
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: {
          current: null,
          scheduled: [sampleScheduledStop1, sampleScheduledStop2],
          history: [],
        },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(
        screen.getByRole('button', { name: 'Cancel the stop on Fri 17 Jul, 12:00' })
      )

      await waitFor(() => {
        expect(mockEndStopMutation).toHaveBeenCalledWith({ id: sampleScheduledStop2.id })
      })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'The scheduled stop is cancelled.',
      })
    })
  })

  describe('dialog triggers', () => {
    it('clicking Stop now opens StopDispatchDialog in now mode', () => {
      render(<DispatchPanel />)
      expect(screen.queryByTestId('mock-stop-dialog')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Stop now' }))
      const dialog = screen.getByTestId('mock-stop-dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('data-mode', 'now')
    })

    it('clicking Schedule a stop opens StopDispatchDialog in schedule mode', () => {
      render(<DispatchPanel />)
      expect(screen.queryByTestId('mock-stop-dialog')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Schedule a stop' }))
      const dialog = screen.getByTestId('mock-stop-dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('data-mode', 'schedule')
    })
  })

  describe('History dialog (AC-8: the record)', () => {
    it('clicking History opens dialog and lists stops with outcome including who', () => {
      const historicStop1: DispatchStopAdminDto = {
        ...sampleActiveStop,
        id: 'hist-1',
        createdByUserId: 'usr-admin-abcdef',
        startedAt: '2026-07-15T09:00:00Z',
        endedAt: '2026-07-15T12:00:00Z',
        endedByUserId: 'usr-admin-restarted',
      }
      const historicStop2: DispatchStopAdminDto = {
        ...sampleActiveStop,
        id: 'hist-2',
        reason: 'STORM',
        createdByUserId: 'usr-admin-123456',
        startedAt: '2026-07-15T09:00:00Z',
        endedAt: '2026-07-15T12:00:00Z',
        endedByUserId: null,
      }
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [], history: [historicStop1, historicStop2] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'History' }))

      expect(screen.getByRole('heading', { name: 'Dispatch stops' })).toBeInTheDocument()
      expect(screen.getByText('Heat')).toBeInTheDocument()
      expect(screen.getByText('Storm')).toBeInTheDocument()
      expect(screen.getAllByText('Wed 15 Jul, 12:00')).toHaveLength(2)
      // Shows last 6 characters of createdByUserId: 'abcdef'
      expect(screen.getByText('abcdef')).toBeInTheDocument()
      // Outcome with who: 'usr-admin-restarted'.slice(-6) -> 'tarted'
      expect(screen.getByText('Restarted Wed 15 Jul, 15:00 by tarted')).toBeInTheDocument()
      // Outcome without who when endedByUserId is null
      expect(screen.getByText('Restarted Wed 15 Jul, 15:00')).toBeInTheDocument()
    })

    it('shows "No stops yet." when history list is empty', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'History' }))
      expect(screen.getByText('No stops yet.')).toBeInTheDocument()
    })

    it('returns focus to History button when History dialog closes', async () => {
      render(<DispatchPanel />)
      const historyBtn = screen.getByRole('button', { name: 'History' })
      fireEvent.click(historyBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close the dialog using Close button provided by DialogContent
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(document.activeElement).toBe(historyBtn)
      })
    })
  })

  describe('closing dialog mode and focus preservation (spec 0014, AC-12, row 29 review)', () => {
    it('keeps dialog mode while closing: open Schedule a stop, close it, title stays "Schedule a stop" until gone and focus goes to Schedule button', () => {
      render(<DispatchPanel />)

      const scheduleBtn = screen.getByRole('button', { name: 'Schedule a stop' })
      fireEvent.click(scheduleBtn)

      // Dialog is open with Schedule title
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Schedule a stop' })).toBeInTheDocument()

      // Close the dialog
      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

      // While closing (when open is false), mode must not have flipped to 'now'
      const closingRenderProps = mockDialogPropsHistory[mockDialogPropsHistory.length - 1]
      expect(closingRenderProps?.open).toBe(false)
      expect(closingRenderProps?.mode).toBe('schedule')

      // Once closed, dialog is gone and focus is returned to Schedule a stop button
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.activeElement).toBe(scheduleBtn)
    })

    it('after Stop now when a stop is on (Restart now shown, no Stop now button), focus goes to Schedule a stop', () => {
      const { rerender } = render(<DispatchPanel />)

      const stopNowBtn = screen.getByRole('button', { name: 'Stop now' })
      const scheduleBtn = screen.getByRole('button', { name: 'Schedule a stop' })

      // Open "Stop now" dialog
      fireEvent.click(stopNowBtn)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // A stop is now on (e.g. Stop now took effect, or query updated):
      // "Stop now" button is unmounted and "Restart now" is shown
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: sampleActiveStop, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      rerender(<DispatchPanel />)

      expect(screen.queryByRole('button', { name: 'Stop now' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Restart now' })).toBeInTheDocument()

      // Close the dialog
      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

      // Focus must return to "Schedule a stop" button because "Stop now" is gone
      expect(document.activeElement).toBe(scheduleBtn)
    })
  })
})
