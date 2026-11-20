import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CourierTimeWorkedCard } from './CourierTimeWorkedCard'
import { useGetCourierTimeWorkedQuery } from '../../api/timeWorkedApi'
import { athensToday } from '../dispatch-stop/dispatchStopDisplay'
import { addDays } from './timeWorkedFormat'

jest.mock('../../api/timeWorkedApi', () => ({
  useGetCourierTimeWorkedQuery: jest.fn(),
}))

describe('CourierTimeWorkedCard (spec 0040, AC-8, AC-11, AC-15)', () => {
  const mockUseGetCourierTimeWorkedQuery = useGetCourierTimeWorkedQuery as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls getCourierTimeWorked with rider id, last 7 Athens days and pollingInterval by default', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [],
        shifts: [],
      },
      isLoading: false,
      isFetching: false,
    })

    const today = athensToday()
    const defaultFrom = addDays(today, -6)

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
      {
        courierId: 'courier-c1',
        from: defaultFrom,
        to: today,
      },
      { skip: false, pollingInterval: 0 }
    )
  })

  it('renders day blocks, shifts with split, break in Athens time, and started before these days', () => {
    // 2026-11-19T13:00:00Z is 15:00 in Europe/Athens (UTC+2)
    // 2026-11-19T13:20:00Z is 15:20 in Europe/Athens (UTC+2)
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 7200, // 2 h 00 min
            jobSeconds: 3600, // 1 h 00 min
            paidWaitSeconds: 600, // 10 min
            unpaidSeconds: 3000, // 50 min
            moneyCents: 3500, // €35.00
            unlinkedMoneyCents: 500, // €5.00
            centsPerHour: 1500, // €15.00
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T12:00:00.000Z', // 14:00 Athens
            startedBeforeRange: true,
            endedAt: '2026-11-19T15:00:00.000Z', // 17:00 Athens
            onBreakSince: null,
            workSeconds: 7200,
            jobSeconds: 3600,
            paidWaitSeconds: 600,
            unpaidSeconds: 3000,
            breaks: [
              {
                startedAt: '2026-11-19T13:00:00.000Z', // 15:00 Athens
                endedAt: '2026-11-19T13:20:00.000Z', // 15:20 Athens
              },
            ],
            moneyCents: 3500,
            lateMoneyCents: 500,
            centsPerHour: 1500,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // Day block
    expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
    expect(screen.getByText(/2 h 00 min worked/)).toBeInTheDocument()
    expect(screen.getByText(/€5.00 paid for work outside a recorded shift/)).toBeInTheDocument()

    // Shift details
    expect(screen.getByText('Started before these days')).toBeInTheDocument()
    expect(screen.getByText(/€5.00 of it added later/)).toBeInTheDocument()

    // Break in Athens time: 13:00 UTC -> 15:00 Athens, 13:20 UTC -> 15:20 Athens
    expect(screen.getByText('Break 15:00 to 15:20')).toBeInTheDocument()

    // Shift and day splits
    expect(screen.getAllByText('Jobs 1 h 00 min · Paid waiting 10 min · Unpaid 50 min')).toHaveLength(2)
  })

  it('renders records behind the shift: status changes with admin label, and jobs with compensations (AC-8, AC-15)', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 1200,
            unlinkedMoneyCents: 0,
            centsPerHour: 1200,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T10:00:00.000Z',
            startedBeforeRange: false,
            endedAt: '2026-11-19T11:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 1200,
            lateMoneyCents: 0,
            centsPerHour: 1200,
            currencyCode: 'EUR',
            statusChanges: [
              {
                at: '2026-11-19T10:00:00.000Z',
                fromStatus: 'OFFLINE',
                toStatus: 'ONLINE',
                cause: 'ADMIN',
                byAdmin: true,
                adminLabel: 'coordinator@volos.coop',
              },
              {
                at: '2026-11-19T11:00:00.000Z',
                fromStatus: 'ONLINE',
                toStatus: 'OFFLINE',
                cause: 'RIDER',
                byAdmin: false,
                adminLabel: null,
              },
            ],
            jobs: [
              {
                deliveryId: 'del-987',
                pickupName: 'Volos Bakery',
                acceptedAt: '2026-11-19T10:10:00.000Z',
                endedAt: '2026-11-19T10:40:00.000Z',
                endEventType: 'DROPPED_OFF',
                droppedOff: true,
                deliveryMoneyCents: 1000,
                paidWaitSeconds: 0,
                compensations: [
                  {
                    id: 'comp-1',
                    reason: 'WAITING',
                    amountCents: 200,
                    createdAt: '2026-11-19T12:00:00.000Z',
                    addedLater: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // Summary element
    expect(screen.getByText('Records behind this shift')).toBeInTheDocument()

    // Status change with admin label in brackets
    expect(
      screen.getByText((content) =>
        content.includes('Offline to Online, by an admin (coordinator@volos.coop)')
      )
    ).toBeInTheDocument()

    // Status change by rider
    expect(
      screen.getByText((content) =>
        content.includes('Online to Offline, by the rider')
      )
    ).toBeInTheDocument()

    // Job details
    expect(screen.getByText(/Volos Bakery/)).toBeInTheDocument()
    expect(screen.getByText('del-987')).toBeInTheDocument()
    expect(screen.getByText(/Delivery pay €10.00/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting €2.00/)).toBeInTheDocument()
    expect(screen.getByText(/added/)).toBeInTheDocument()
  })

  it('refuses a 32 day range in DayRangeForm and does not call the query', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: { recordedFrom: null, currencyCode: 'EUR', days: [], shifts: [] },
      isLoading: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)
    mockUseGetCourierTimeWorkedQuery.mockClear()

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const showButton = screen.getByRole('button', { name: 'Show' })

    // 2026-01-01 to 2026-02-01 = 32 days
    fireEvent.change(fromInput, { target: { value: '2026-01-01' } })
    fireEvent.change(toInput, { target: { value: '2026-02-01' } })
    fireEvent.click(showButton)

    expect(screen.getByRole('alert')).toHaveTextContent('A range may cover at most 31 days.')
    expect(mockUseGetCourierTimeWorkedQuery).not.toHaveBeenCalled()
  })

  // 1. The day line shows day.moneyCents minus day.unlinkedMoneyCents
  it('shows day.moneyCents minus day.unlinkedMoneyCents on the day line (€30.00 for 3500 minus 500)', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 7200,
            jobSeconds: 3600,
            paidWaitSeconds: 600,
            unpaidSeconds: 3000,
            moneyCents: 3500,
            unlinkedMoneyCents: 500,
            centsPerHour: 1500,
          },
        ],
        shifts: [],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    expect(screen.getByText(/2 h 00 min worked · €30.00 · €15.00 per hour/)).toBeInTheDocument()
    expect(screen.queryByText('€35.00')).toBeNull()
  })

  // 2. A shift is placed under the Athens day it started on
  it('places a shift under the Athens day it started on (2026-11-18T22:30:00Z sits under Thu 19 Nov)', () => {
    // 2026-11-18T22:30:00Z is 2026-11-19 00:30 in Athens (UTC+2 in Nov).
    // Slicing UTC string gives '2026-11-18', which is NOT in days, so it would wrongfully fall into 'earlier'.
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 1500,
            unlinkedMoneyCents: 0,
            centsPerHour: 1500,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-18T22:30:00.000Z',
            startedBeforeRange: false,
            endedAt: '2026-11-18T23:30:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 1500,
            lateMoneyCents: 0,
            centsPerHour: 1500,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // The shift starts at 00:30 Athens on Thu 19 Nov
    expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
    expect(screen.getByText(/Thu 19 Nov, 00:30 to 01:30/)).toBeInTheDocument()
    // It must NOT appear in "Began before these days"
    expect(screen.queryByText('Began before these days')).toBeNull()
  })

  // 3. A shift that began before the first day block is under "Began before these days"
  it('renders shifts that began before the first day block under "Began before these days", newest first', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 3600,
            jobSeconds: 3600,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            moneyCents: 1500,
            unlinkedMoneyCents: 0,
            centsPerHour: 1500,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T10:00:00.000Z',
            startedBeforeRange: false,
            endedAt: '2026-11-19T11:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 3600,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            breaks: [],
            moneyCents: 1500,
            lateMoneyCents: 0,
            centsPerHour: 1500,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
          // Earlier shift 1: 17 Nov
          {
            startedAt: '2026-11-17T10:00:00.000Z',
            startedBeforeRange: true,
            endedAt: '2026-11-17T12:00:00.000Z',
            onBreakSince: null,
            workSeconds: 7200,
            jobSeconds: 7200,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            breaks: [],
            moneyCents: 2500,
            lateMoneyCents: 0,
            centsPerHour: 1250,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
          // Earlier shift 2: 18 Nov (newer than 17 Nov)
          {
            startedAt: '2026-11-18T10:00:00.000Z',
            startedBeforeRange: true,
            endedAt: '2026-11-18T12:00:00.000Z',
            onBreakSince: null,
            workSeconds: 7200,
            jobSeconds: 7200,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            breaks: [],
            moneyCents: 3000,
            lateMoneyCents: 0,
            centsPerHour: 1500,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    const earlierHeading = screen.getByText('Began before these days')
    expect(earlierHeading).toBeInTheDocument()

    // Assert newest first: 18 Nov before 17 Nov
    const shift18 = screen.getByText(/Wed 18 Nov, 12:00 to 14:00/)
    const shift17 = screen.getByText(/Tue 17 Nov, 12:00 to 14:00/)
    expect(shift18.compareDocumentPosition(shift17) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // 4. Order: two days and two shifts come newest first
  it('renders two days and two shifts in newest first order', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          // Older day first in API response
          {
            date: '2026-11-18',
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 1000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1000,
          },
          // Newer day second in API response
          {
            date: '2026-11-19',
            workSeconds: 7200,
            jobSeconds: 3600,
            paidWaitSeconds: 0,
            unpaidSeconds: 3600,
            moneyCents: 2000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1000,
          },
        ],
        shifts: [
          // Older shift on 19 Nov
          {
            startedAt: '2026-11-19T08:00:00.000Z', // 10:00 Athens
            startedBeforeRange: false,
            endedAt: '2026-11-19T09:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 1000,
            lateMoneyCents: 0,
            centsPerHour: 1000,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
          // Newer shift on 19 Nov
          {
            startedAt: '2026-11-19T14:00:00.000Z', // 16:00 Athens
            startedBeforeRange: false,
            endedAt: '2026-11-19T15:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 1000,
            lateMoneyCents: 0,
            centsPerHour: 1000,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // Check days order: Thu 19 Nov comes before Wed 18 Nov
    const day19 = screen.getByText('Thu, 19 Nov 2026')
    const day18 = screen.getByText('Wed, 18 Nov 2026')
    expect(day19.compareDocumentPosition(day18) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Check shifts order under 19 Nov: 16:00 comes before 10:00
    const shiftNewer = screen.getByText(/Thu 19 Nov, 16:00 to 17:00/)
    const shiftOlder = screen.getByText(/Thu 19 Nov, 10:00 to 11:00/)
    expect(shiftNewer.compareDocumentPosition(shiftOlder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // 5. States: loading, error, empty, recordedFrom null, open shift, break, held job vs ended job, centsPerHour null, CUT_OFF admin label, unknown values
  it('renders loading state', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isFetching: false,
    })
    render(<CourierTimeWorkedCard courierId="courier-c1" />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders error state when query fails', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isError: true,
    })
    render(<CourierTimeWorkedCard courierId="courier-c1" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load the time worked.')
  })

  it('renders "No time worked in these days." when no days and no shifts exist', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [],
        shifts: [],
      },
      isLoading: false,
      isFetching: false,
    })
    render(<CourierTimeWorkedCard courierId="courier-c1" />)
    expect(screen.getByText('No time worked in these days.')).toBeInTheDocument()
  })

  it('renders "today" when recordedFrom is null', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: null,
        currencyCode: 'EUR',
        days: [],
        shifts: [],
      },
      isLoading: false,
      isFetching: false,
    })
    render(<CourierTimeWorkedCard courierId="courier-c1" />)
    expect(screen.getByText('Time worked is recorded from today.')).toBeInTheDocument()
  })

  it('renders open shift, break since, held job with "Not delivered yet", and null centsPerHour as em dash', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 1800,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            moneyCents: 0,
            unlinkedMoneyCents: 0,
            centsPerHour: null,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T10:00:00.000Z', // 12:00 Athens
            startedBeforeRange: false,
            endedAt: null, // open shift
            onBreakSince: '2026-11-19T10:20:00.000Z', // 12:20 Athens
            workSeconds: 1800,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 0,
            breaks: [],
            moneyCents: 0,
            lateMoneyCents: 0,
            centsPerHour: null, // null centsPerHour
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [
              {
                deliveryId: 'del-held-1',
                pickupName: 'Acropolis Grill',
                acceptedAt: '2026-11-19T10:05:00.000Z',
                endedAt: null, // job still held
                endEventType: null,
                droppedOff: false,
                deliveryMoneyCents: 0,
                paidWaitSeconds: 0,
                compensations: [],
              },
            ],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // Open shift
    expect(screen.getByText(/still open/)).toBeInTheDocument()
    // Break since
    expect(screen.getByText(/\(on a break since 12:20\)/)).toBeInTheDocument()
    // centsPerHour: null shows "—"
    expect(screen.getAllByText(/— per hour/)).toHaveLength(2)
    // Held job
    expect(screen.getByText(/still held/)).toBeInTheDocument()
    expect(screen.getByText(/Not delivered yet/)).toBeInTheDocument()
    expect(screen.queryByText(/Not delivered by this rider/)).toBeNull()
  })

  it('renders "Not delivered by this rider" for ended job not dropped off', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 0,
            unlinkedMoneyCents: 0,
            centsPerHour: 0,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T10:00:00.000Z',
            startedBeforeRange: false,
            endedAt: '2026-11-19T11:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 0,
            lateMoneyCents: 0,
            centsPerHour: 0,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [
              {
                deliveryId: 'del-ended-canceled',
                pickupName: 'Acropolis Grill',
                acceptedAt: '2026-11-19T10:05:00.000Z',
                endedAt: '2026-11-19T10:25:00.000Z',
                endEventType: 'CANCELED',
                droppedOff: false,
                deliveryMoneyCents: 0,
                paidWaitSeconds: 0,
                compensations: [],
              },
            ],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    expect(screen.getByText(/Not delivered by this rider/)).toBeInTheDocument()
    expect(screen.queryByText(/Not delivered yet/)).toBeNull()
  })

  it('renders admin label on CUT_OFF change, and falls back to code for unknown status or cause', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            moneyCents: 1000,
            unlinkedMoneyCents: 0,
            centsPerHour: 1000,
          },
        ],
        shifts: [
          {
            startedAt: '2026-11-19T10:00:00.000Z',
            startedBeforeRange: false,
            endedAt: '2026-11-19T11:00:00.000Z',
            onBreakSince: null,
            workSeconds: 3600,
            jobSeconds: 1800,
            paidWaitSeconds: 0,
            unpaidSeconds: 1800,
            breaks: [],
            moneyCents: 1000,
            lateMoneyCents: 0,
            centsPerHour: 1000,
            currencyCode: 'EUR',
            statusChanges: [
              {
                at: '2026-11-19T10:30:00.000Z',
                fromStatus: 'ONLINE',
                toStatus: 'OFFLINE',
                cause: 'CUT_OFF',
                byAdmin: true,
                adminLabel: 'admin@example.com',
              },
              {
                at: '2026-11-19T10:45:00.000Z',
                fromStatus: 'MY_FUTURE_STATUS' as any,
                toStatus: 'ONLINE',
                cause: 'MY_FUTURE_CAUSE' as any,
                byAdmin: false,
                adminLabel: null,
              },
            ],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // CUT_OFF with admin label
    expect(
      screen.getByText((content) =>
        content.includes('Online to Offline, by a password change (admin@example.com)')
      )
    ).toBeInTheDocument()

    // Unknown status and cause show their codes directly
    expect(
      screen.getByText((content) =>
        content.includes('MY_FUTURE_STATUS to Online, MY_FUTURE_CAUSE')
      )
    ).toBeInTheDocument()
  })

  // 6. Dates past midnight: shift from Thu 19 Nov 22:00 Athens to Sat 21 Nov 09:00 Athens shows end with date, same day shows time only
  it('shows end date when shift ends past midnight (different Athens day) and time only for same day', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: {
        recordedFrom: '2026-11-01T00:00:00Z',
        currencyCode: 'EUR',
        days: [
          {
            date: '2026-11-19',
            workSeconds: 126000,
            jobSeconds: 0,
            paidWaitSeconds: 0,
            unpaidSeconds: 126000,
            moneyCents: 0,
            unlinkedMoneyCents: 0,
            centsPerHour: 0,
          },
        ],
        shifts: [
          // Shift ending on a different Athens day
          {
            startedAt: '2026-11-19T20:00:00.000Z', // Thu 19 Nov 22:00 Athens
            startedBeforeRange: false,
            endedAt: '2026-11-21T07:00:00.000Z', // Sat 21 Nov 09:00 Athens
            onBreakSince: null,
            workSeconds: 126000,
            jobSeconds: 0,
            paidWaitSeconds: 0,
            unpaidSeconds: 126000,
            breaks: [],
            moneyCents: 0,
            lateMoneyCents: 0,
            centsPerHour: 0,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
          // Shift ending on the same Athens day
          {
            startedAt: '2026-11-19T10:00:00.000Z', // Thu 19 Nov 12:00 Athens
            startedBeforeRange: false,
            endedAt: '2026-11-19T12:00:00.000Z', // Thu 19 Nov 14:00 Athens
            onBreakSince: null,
            workSeconds: 7200,
            jobSeconds: 0,
            paidWaitSeconds: 0,
            unpaidSeconds: 7200,
            breaks: [],
            moneyCents: 0,
            lateMoneyCents: 0,
            centsPerHour: 0,
            currencyCode: 'EUR',
            statusChanges: [],
            jobs: [],
          },
        ],
      },
      isLoading: false,
      isFetching: false,
    })

    render(<CourierTimeWorkedCard courierId="courier-c1" />)

    // Cross-day shift: shows end with its date "Sat 21 Nov, 09:00"
    expect(screen.getByText(/Thu 19 Nov, 22:00 to Sat 21 Nov, 09:00/)).toBeInTheDocument()

    // Same day shift: shows time only "14:00"
    expect(screen.getByText(/Thu 19 Nov, 12:00 to 14:00/)).toBeInTheDocument()
  })

  // 7. Polling (decision 36.49)
  it('polls with pollingInterval when range includes today, and sets pollingInterval 0 when range ends before today (decision 36.49)', () => {
    mockUseGetCourierTimeWorkedQuery.mockReturnValue({
      currentData: { recordedFrom: null, currencyCode: 'EUR', days: [], shifts: [] },
      isLoading: false,
    })

    const today = athensToday()
    const defaultFrom = addDays(today, -6)

    render(<CourierTimeWorkedCard courierId="courier-c1" pollingInterval={30000} />)

    // Default range ends on today -> pollingInterval 30000
    expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
      { courierId: 'courier-c1', from: defaultFrom, to: today },
      { skip: false, pollingInterval: 30000 }
    )

    mockUseGetCourierTimeWorkedQuery.mockClear()

    // Change range to end yesterday (before today)
    const yesterday = addDays(today, -1)
    const pastFrom = addDays(today, -7)

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const showButton = screen.getByRole('button', { name: 'Show' })

    fireEvent.change(fromInput, { target: { value: pastFrom } })
    fireEvent.change(toInput, { target: { value: yesterday } })
    fireEvent.click(showButton)

    // Range ending before today -> pollingInterval: 0
    expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
      { courierId: 'courier-c1', from: pastFrom, to: yesterday },
      { skip: false, pollingInterval: 0 }
    )
  })
})
