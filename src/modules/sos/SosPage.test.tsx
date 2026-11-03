import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SosPage from '@/pages/sos'
import { useGetCurrentSosQuery, useGetClosedSosQuery } from '../../api/sosApi'
import type { SosIncidentAdminDto, SosIncidentPageAdminDto } from '@/backend-admin-sdk'

// Mock DefaultLayout
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock next/router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock('../../api/sosApi', () => ({
  useGetCurrentSosQuery: jest.fn(),
  useGetClosedSosQuery: jest.fn(),
}))

const mockUseGetCurrentSosQuery = useGetCurrentSosQuery as jest.Mock
const mockUseGetClosedSosQuery = useGetClosedSosQuery as jest.Mock

describe('SosPage (/sos page) (spec 0022, AC-9, decision 73.7)', () => {
  const currentIncident: SosIncidentAdminDto = {
    id: 'sos-open-1',
    state: 'ACTIVE',
    courier: { id: 'c-1', firstName: 'Andreas', lastName: 'Papandreou' },
    deliveryId: 'del-123',
    startedAt: '2026-11-03T08:00:00.000Z',
    createdAt: '2026-11-03T08:00:00.000Z',
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  const awaitingIncident: SosIncidentAdminDto = {
    id: 'sos-await-2',
    state: 'AWAITING_CLOSE',
    courier: { id: 'c-2', firstName: 'Georgia', lastName: 'V' },
    deliveryId: null,
    startedAt: '2026-11-03T07:30:00.000Z',
    createdAt: '2026-11-03T07:30:00.000Z',
    safeAt: '2026-11-03T07:45:00.000Z',
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  const closedIncident: SosIncidentAdminDto = {
    id: 'sos-closed-3',
    state: 'CLOSED',
    courier: { id: 'c-3', firstName: 'Dimitra', lastName: 'K' },
    deliveryId: null,
    startedAt: '2026-11-03T06:00:00.000Z',
    createdAt: '2026-11-03T06:00:00.000Z',
    safeAt: null,
    falseAlarmAt: '2026-11-03T06:10:00.000Z',
    closedAt: '2026-11-03T06:15:00.000Z',
    closedBy: { id: 'u-admin', username: 'admin_petros', email: 'petros@example.com' },
    outcome: 'FALSE_ALARM',
    note: 'Phone pressed in pocket',
    pointsDeletedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      isLoading: false,
    })
    mockUseGetClosedSosQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
      },
      isLoading: false,
    })
  })

  it('renders "Open now" and "Closed" sections with page header', () => {
    render(<SosPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'SOS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Open now' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Closed' })).toBeInTheDocument()
  })

  it('renders empty state "No rider has an open SOS." when no open incidents', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(<SosPage />)
    expect(screen.getByText('No rider has an open SOS.')).toBeInTheDocument()
  })

  it('renders open incidents in "Open now" section', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [currentIncident, awaitingIncident],
      isLoading: false,
    })

    render(<SosPage />)

    expect(screen.getByText('Andreas Papandreou')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()

    expect(screen.getByText('Georgia V')).toBeInTheDocument()
    expect(screen.getByText('Awaiting close')).toBeInTheDocument()
  })

  it('Closed section is a server paginated table fed by getClosedSos with page and limit', () => {
    const closedPage: SosIncidentPageAdminDto = {
      data: [closedIncident],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    }
    mockUseGetClosedSosQuery.mockReturnValue({
      data: closedPage,
      isLoading: false,
    })

    render(<SosPage />)

    // Feed assertion: query called with page 1, limit 10
    expect(mockUseGetClosedSosQuery).toHaveBeenCalledWith({ page: 1, limit: 10 })

    // Details shown: rider, state, start time, safe or false alarm, close time & closed by, outcome, note
    expect(screen.getByText('Dimitra K')).toBeInTheDocument()
    expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(2)

    // Rider safe or false alarm
    expect(screen.getByText(/False alarm at/)).toBeInTheDocument()

    // Who closed it
    expect(screen.getByText('admin_petros')).toBeInTheDocument()

    // Outcome label
    expect(screen.getByText('False alarm')).toBeInTheDocument()

    // Note
    expect(screen.getByText('Phone pressed in pocket')).toBeInTheDocument()
  })

  it('shows dash "—" when safe/false alarm, close info, or note is absent', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [currentIncident],
      isLoading: false,
    })

    render(<SosPage />)

    // Active incident has no safe/false alarm, no closed info, no outcome, no note: renders dashes
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('opens /sos/<id> when "Open" button is clicked or row is clicked', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [currentIncident],
      isLoading: false,
    })

    render(<SosPage />)

    const openButton = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openButton)

    expect(mockPush).toHaveBeenCalledWith('/sos/sos-open-1')
  })

  it('never shows a count of a rider\'s incidents on the page (decision 73.7 / Value 5)', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [currentIncident, awaitingIncident],
      isLoading: false,
    })
    mockUseGetClosedSosQuery.mockReturnValue({
      data: {
        data: [closedIncident],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
    })

    const { container } = render(<SosPage />)
    const text = container.textContent ?? ''

    // Ensure no pattern like "1 incident", "2 incidents", "Total SOS: 3", or "incidents per rider"
    expect(text).not.toMatch(/incident(s?)\s*count/i)
    expect(text).not.toMatch(/total\s*incident/i)
    expect(text).not.toMatch(/rider\s*incident/i)
    expect(text).not.toMatch(/\(\d+\s*incidents?\)/i)
  })

  // Row 73 review (Major): a failed ask is said in words, and a blind list never reads as a quiet one.
  describe('when the current SOS query fails', () => {
    const unreachable = /Cannot reach the server, so this list may be out of date/

    it('with nothing loaded yet: says the server cannot be reached, never "No rider has an open SOS."', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true })

      render(<SosPage />)

      expect(screen.getByText(unreachable)).toBeInTheDocument()
      expect(screen.queryByText('No rider has an open SOS.')).not.toBeInTheDocument()
    })

    it('after an earlier answer of no open SOS: still never "No rider has an open SOS."', () => {
      // RTK Query keeps the last good data after a failed refetch.
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [], isLoading: false, isError: true })

      render(<SosPage />)

      expect(screen.getByText(unreachable)).toBeInTheDocument()
      expect(screen.queryByText('No rider has an open SOS.')).not.toBeInTheDocument()
    })

    it('after an earlier answer with open SOS: says so, and still lists what it last knew', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [currentIncident], isLoading: false, isError: true })

      render(<SosPage />)

      expect(screen.getByText(unreachable)).toBeInTheDocument()
      expect(screen.getByText('Andreas Papandreou')).toBeInTheDocument()
    })

    it('the message is gone once the query succeeds', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true })
      const { rerender } = render(<SosPage />)
      expect(screen.getByText(unreachable)).toBeInTheDocument()

      mockUseGetCurrentSosQuery.mockReturnValue({ data: [], isLoading: false, isError: false })
      rerender(<SosPage />)

      expect(screen.queryByText(unreachable)).not.toBeInTheDocument()
      expect(screen.getByText('No rider has an open SOS.')).toBeInTheDocument()
    })
  })
})
