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

jest.mock('./StopDispatchDialog', () => ({
  StopDispatchDialog: ({ open, mode }: { open: boolean; mode: string }) =>
    open ? <div data-testid="mock-stop-dialog" data-mode={mode} /> : null,
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

  const sampleScheduledStop: DispatchStopAdminDto = {
    id: 'stop-sched-2',
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

  beforeEach(() => {
    jest.clearAllMocks()
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

    it('shows "Dispatch is stopped until <HH:mm> (<Reason>)." and Restart now button when a timed stop is active', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: sampleActiveStop, scheduled: [], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      // 15:00 UTC in July is 18:00 Athens time
      expect(
        screen.getByText(/Dispatch is stopped until 18:00 \(Heat\)\./i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Restart now' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Stop now' })).not.toBeInTheDocument()
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
    it('shows next scheduled stop with Cancel it link/button', () => {
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [sampleScheduledStop], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      // 10:00 UTC July 16 is Thu 16 Jul, 13:00 Athens; 14:00 UTC is 17:00 Athens
      expect(
        screen.getByText(/Next stop: Thu 16 Jul, 13:00 to 17:00 \(Storm\)\./i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel it' })).toBeInTheDocument()
    })

    it('clicking Cancel it calls end mutation with scheduled stop id and shows toast', async () => {
      mockEndStopMutation.mockReturnValue({
        unwrap: () => Promise.resolve(sampleScheduledStop),
      })
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [sampleScheduledStop], history: [] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel it' }))

      await waitFor(() => {
        expect(mockEndStopMutation).toHaveBeenCalledWith({ id: sampleScheduledStop.id })
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
    it('clicking History opens dialog and lists stops with their outcome', () => {
      const historicStop: DispatchStopAdminDto = {
        ...sampleActiveStop,
        id: 'hist-1',
        createdByUserId: 'usr-admin-abcdef',
        startedAt: '2026-07-15T09:00:00Z',
        endedAt: '2026-07-15T12:00:00Z',
      }
      mockUseGetDispatchStopsQuery.mockReturnValue({
        data: { current: null, scheduled: [], history: [historicStop] },
        isLoading: false,
        isError: false,
      })
      render(<DispatchPanel />)

      fireEvent.click(screen.getByRole('button', { name: 'History' }))

      expect(screen.getByRole('heading', { name: 'Dispatch stops' })).toBeInTheDocument()
      expect(screen.getByText('Heat')).toBeInTheDocument()
      expect(screen.getByText('Wed 15 Jul, 12:00')).toBeInTheDocument()
      // Shows last 6 characters of createdByUserId: 'abcdef'
      expect(screen.getByText('abcdef')).toBeInTheDocument()
      // Outcome
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
})
