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

  it('calls getCourierTimeWorked with rider id and the last 7 Athens days by default', () => {
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
      { skip: false }
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
    expect(screen.getByText(/€5.00 paid for work before recording began/)).toBeInTheDocument()

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
})
