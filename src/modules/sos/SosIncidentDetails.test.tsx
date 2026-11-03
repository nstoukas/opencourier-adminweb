import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SosIncidentDetails } from './SosIncidentDetails'
import { useGetSosIncidentQuery } from '../../api/sosApi'
import type { SosIncidentDetailAdminDto } from '@/backend-admin-sdk'

// Mock next/dynamic to render a mock map that inspects props.points
jest.mock('next/dynamic', () => () => {
  return function MockSosTrailMap({ points }: { points: any[] }) {
    return (
      <div data-testid="sos-trail-map" data-points-count={points.length}>
        {points.map((p, idx) => (
          <span key={idx} data-testid={`point-${idx}`}>
            {p.latitude},{p.longitude}
          </span>
        ))}
      </div>
    )
  }
})

jest.mock('../../api/sosApi', () => ({
  useGetSosIncidentQuery: jest.fn(),
  useCloseSosMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
}))

const mockUseGetSosIncidentQuery = useGetSosIncidentQuery as jest.Mock

describe('SosIncidentDetails (spec 0022, AC-9, AC-10)', () => {
  const samplePoints = [
    { latitude: 39.362, longitude: 22.942, accuracyMetres: 5, recordedAt: '2026-11-03T10:00:00.000Z' },
    { latitude: 39.364, longitude: 22.944, accuracyMetres: 4, recordedAt: '2026-11-03T10:01:00.000Z' },
    { latitude: 39.366, longitude: 22.946, accuracyMetres: 3, recordedAt: '2026-11-03T10:02:00.000Z' },
  ]

  const activeIncident: SosIncidentDetailAdminDto = {
    id: 'sos-detail-1',
    state: 'ACTIVE',
    courier: { id: 'c-1', firstName: 'Nikos', lastName: 'Kazantzakis' },
    deliveryId: 'del-99',
    startedAt: '2026-11-03T10:00:00.000Z',
    createdAt: '2026-11-03T10:00:00.000Z',
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
    points: samplePoints,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('with points, renders the trail map with all points in order and a line "<n> positions from ... to ..."', () => {
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: activeIncident,
      currentData: activeIncident,
      isLoading: false,
      isError: false,
    })

    render(<SosIncidentDetails incidentId="sos-detail-1" />)

    // Map rendered with all points in order
    const map = screen.getByTestId('sos-trail-map')
    expect(map).toBeInTheDocument()
    expect(map).toHaveAttribute('data-points-count', '3')
    expect(screen.getByTestId('point-0')).toHaveTextContent('39.362,22.942')
    expect(screen.getByTestId('point-1')).toHaveTextContent('39.364,22.944')
    expect(screen.getByTestId('point-2')).toHaveTextContent('39.366,22.946')

    // Summary line with count and date range (Athens time)
    expect(screen.getByText(/3 positions from .* to .*\./)).toBeInTheDocument()
  })

  it('with no points and pointsDeletedAt set, renders "Location points deleted (...)."', () => {
    const deletedIncident: SosIncidentDetailAdminDto = {
      ...activeIncident,
      points: [],
      pointsDeletedAt: '2026-11-03T02:00:00.000Z',
    }
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: deletedIncident,
      currentData: deletedIncident,
      isLoading: false,
      isError: false,
    })

    render(<SosIncidentDetails incidentId="sos-detail-1" />)

    expect(screen.queryByTestId('sos-trail-map')).not.toBeInTheDocument()
    expect(screen.getByText(/Location points deleted \(.*\)\./)).toBeInTheDocument()
  })

  it('with no points and no pointsDeletedAt, renders "No location points recorded."', () => {
    const emptyIncident: SosIncidentDetailAdminDto = {
      ...activeIncident,
      points: [],
      pointsDeletedAt: null,
    }
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: emptyIncident,
      currentData: emptyIncident,
      isLoading: false,
      isError: false,
    })

    render(<SosIncidentDetails incidentId="sos-detail-1" />)

    expect(screen.queryByTestId('sos-trail-map')).not.toBeInTheDocument()
    expect(screen.getByText('No location points recorded.')).toBeInTheDocument()
  })

  it('on error, renders the "could not be loaded" alert and link back to /sos', () => {
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: false,
      isError: true,
    })

    render(<SosIncidentDetails incidentId="sos-detail-1" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('This SOS could not be loaded.')
    const link = screen.getByRole('link', { name: 'Back to SOS' })
    expect(link).toHaveAttribute('href', '/sos')
  })

  it('shows Close SOS button while state is not CLOSED, and hides it when CLOSED', () => {
    // Case 1: ACTIVE -> shows Close SOS
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: activeIncident,
      currentData: activeIncident,
      isLoading: false,
      isError: false,
    })
    const { rerender } = render(<SosIncidentDetails incidentId="sos-detail-1" />)
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeInTheDocument()

    // Case 2: AWAITING_CLOSE -> shows Close SOS
    const awaitingIncident = { ...activeIncident, state: 'AWAITING_CLOSE' as const }
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: awaitingIncident,
      currentData: awaitingIncident,
      isLoading: false,
      isError: false,
    })
    rerender(<SosIncidentDetails incidentId="sos-detail-1" />)
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeInTheDocument()

    // Case 3: CLOSED -> does NOT show Close SOS
    const closedIncident = { ...activeIncident, state: 'CLOSED' as const, closedAt: '2026-11-03T10:10:00.000Z' }
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: closedIncident,
      currentData: closedIncident,
      isLoading: false,
      isError: false,
    })
    rerender(<SosIncidentDetails incidentId="sos-detail-1" />)
    expect(screen.queryByRole('button', { name: 'Close SOS' })).not.toBeInTheDocument()
  })

  it('reads RTK currentData so a new id never shows the previous incident while fetching', () => {
    // When incidentId changes, RTK Query retains previous query `data` in cache while `currentData` is undefined
    mockUseGetSosIncidentQuery.mockReturnValue({
      data: activeIncident, // Stale previous data
      currentData: undefined, // New query has not resolved yet
      isLoading: true,
      isError: false,
    })

    render(<SosIncidentDetails incidentId="new-sos-id" />)

    // Should render loading spinner rather than stale previous incident
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Nikos Kazantzakis')).not.toBeInTheDocument()
  })

  // Row 73 review: the close dialog starts from how the rider ended it, never from an outcome nobody chose.
  describe('the close dialog starts from the rider\'s own end', () => {
    const openDialogFor = (incident: SosIncidentDetailAdminDto) => {
      mockUseGetSosIncidentQuery.mockReturnValue({
        data: incident,
        currentData: incident,
        isLoading: false,
        isError: false,
      })
      render(<SosIncidentDetails incidentId={incident.id} />)
      fireEvent.click(screen.getByRole('button', { name: 'Close SOS' }))
      return screen.getByLabelText('What happened') as HTMLSelectElement
    }

    it('rider pressed "False alarm" (falseAlarmAt set): starts on False alarm', () => {
      const select = openDialogFor({
        ...activeIncident,
        state: 'AWAITING_CLOSE',
        falseAlarmAt: '2026-11-03T10:05:00.000Z',
      })
      expect(select.value).toBe('FALSE_ALARM')
    })

    it('rider pressed "I\'m safe" (safeAt set): starts on Rider safe', () => {
      const select = openDialogFor({
        ...activeIncident,
        state: 'AWAITING_CLOSE',
        safeAt: '2026-11-03T10:05:00.000Z',
      })
      expect(select.value).toBe('RIDER_SAFE')
    })

    it('still active, the rider ended nothing: starts on "Choose…"', () => {
      const select = openDialogFor(activeIncident)
      expect(select.value).toBe('')
    })
  })

  // Row 73 review nit taken: the page keeps asking every 10 s until the SOS is closed.
  describe('polling', () => {
    const POLL_MS = 10_000

    // Whether any call of the hook during the render subscribed with a 10 s poll.
    const polled = () =>
      mockUseGetSosIncidentQuery.mock.calls.some(
        ([, options]) => options?.skip !== true && options?.pollingInterval === POLL_MS,
      )

    const renderIn = (state: SosIncidentDetailAdminDto['state']) => {
      const incident = { ...activeIncident, state }
      mockUseGetSosIncidentQuery.mockReturnValue({
        data: incident,
        currentData: incident,
        isLoading: false,
        isError: false,
      })
      render(<SosIncidentDetails incidentId="sos-detail-1" />)
    }

    it('polls every 10 s while ACTIVE', () => {
      renderIn('ACTIVE')
      expect(polled()).toBe(true)
    })

    it('polls every 10 s while AWAITING_CLOSE (another admin or tab may close it)', () => {
      renderIn('AWAITING_CLOSE')
      expect(polled()).toBe(true)
    })

    it('stops polling once CLOSED', () => {
      renderIn('CLOSED')
      expect(polled()).toBe(false)
      // No subscription asks again on a timer.
      expect(
        mockUseGetSosIncidentQuery.mock.calls.some(
          ([, options]) => options?.skip !== true && (options?.pollingInterval ?? 0) > 0,
        ),
      ).toBe(false)
    })
  })
})
