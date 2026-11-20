import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CourierTimeWorkedCard } from './CourierTimeWorkedCard'
import { useGetCourierTimeWorkedQuery } from '../../api/timeWorkedApi'
import { athensDateTime, athensToday } from '../dispatch-stop/dispatchStopDisplay'
import { addDays } from './timeWorkedFormat'
import type {
  CourierTimeWorkedDto,
  EarningsFiguresDto,
  EarningsWeekDto,
  JobEndLabel,
  WorkedDayDto,
  WorkedJobDto,
  WorkedShiftDto,
} from '../../backend-admin-sdk'

jest.mock('../../api/timeWorkedApi', () => ({
  useGetCourierTimeWorkedQuery: jest.fn(),
}))

describe('CourierTimeWorkedCard (spec 0040 AC-15; spec 0042 AC-1, AC-8, AC-15, AC-16)', () => {
  const mockUseGetCourierTimeWorkedQuery = useGetCourierTimeWorkedQuery as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makeFigures(overrides: Partial<EarningsFiguresDto> = {}): EarningsFiguresDto {
    return {
      workSeconds: 7200, // 2 h 00 min
      jobSeconds: 3600, // 1 h 00 min
      paidWaitSeconds: 600, // 10 min
      unpaidSeconds: 3000, // 50 min
      moneyCents: 3500, // €35.00
      unlinkedMoneyCents: 500, // €5.00
      noJobMoneyCents: 0,
      centsPerHour: 1500, // €15.00
      activeCentsPerHour: 2000, // €20.00
      paidKm: 10.5,
      centsPerPaidKm: 333, // €3.33
      medianPickupWaitSeconds: 120, // 2 min
      pickupWaitCount: 2,
      dropOffCount: 3,
      ...overrides,
    }
  }

  function makeDay(date: string, overrides: Partial<WorkedDayDto> = {}): WorkedDayDto {
    return {
      date,
      ...makeFigures(),
      ...overrides,
    }
  }

  function makeWeek(weekStart: string, overrides: Partial<EarningsWeekDto> = {}): EarningsWeekDto {
    return {
      weekStart,
      soFar: false,
      cutAtReach: false,
      ...makeFigures(),
      ...overrides,
    }
  }

  function makeJob(deliveryId: string, overrides: Partial<WorkedJobDto> = {}): WorkedJobDto {
    return {
      deliveryId,
      pickupName: 'Acropolis Grill',
      acceptedAt: '2026-11-19T10:00:00.000Z', // 12:00 Athens
      endedAt: '2026-11-19T10:25:00.000Z', // 12:25 Athens (25 min)
      endEventType: 'DROPPED_OFF',
      droppedOff: true,
      deliveryMoneyCents: 800,
      paidWaitSeconds: 0,
      compensations: [],
      paidKm: 2.5,
      dropoffArea: 'Syntagma',
      pickupWaitSeconds: 90,
      cancelledAfterPickup: false,
      endLabel: null,
      ...overrides,
    }
  }

  function makeShift(startedAt: string, overrides: Partial<WorkedShiftDto> = {}): WorkedShiftDto {
    return {
      startedAt,
      startedBeforeRange: false,
      endedAt: '2026-11-19T12:00:00.000Z',
      onBreakSince: null,
      workSeconds: 7200,
      jobSeconds: 3600,
      paidWaitSeconds: 600,
      unpaidSeconds: 3000,
      breaks: [],
      moneyCents: 3500,
      lateMoneyCents: 0,
      centsPerHour: 1500,
      currencyCode: 'EUR',
      statusChanges: [],
      jobs: [],
      ...overrides,
    }
  }

  // --- AC-15, AC-1: Weeks & Days Figures ---
  describe('AC-15, AC-1: Figures for each week and each day', () => {
    it('shows week figures, drop offs, work time, rates, typical wait with count, and (so far) tag', () => {
      const week: EarningsWeekDto = makeWeek('2026-11-16', {
        soFar: true,
        moneyCents: 4200,
        dropOffCount: 4,
        workSeconds: 10800, // 3 h 00 min
        centsPerHour: 1400, // €14.00
        activeCentsPerHour: 1800, // €18.00
        centsPerPaidKm: 350, // €3.50
        medianPickupWaitSeconds: 180, // 3 min
        pickupWaitCount: 5,
        jobSeconds: 7200,
        paidWaitSeconds: 1200,
        unpaidSeconds: 2400,
        noJobMoneyCents: 200,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-16')],
          weeks: [week],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Week header with (so far)
      expect(screen.getByText(/Week Mon, 16 Nov 2026 to Sun, 22 Nov 2026 \(so far\)/)).toBeInTheDocument()

      // Money, drop offs, work time
      expect(screen.getByText(/€42.00 · 4 drop offs · 3 h 00 min worked/)).toBeInTheDocument()

      // All 4 rates + wait
      expect(
        screen.getByText(
          /€14.00 per hour worked · €18.00 per hour on a job · €3.50 per paid km · typical pickup wait 3 min \(5 waits\)/
        )
      ).toBeInTheDocument()

      // Split
      expect(screen.getByText('Jobs 2 h 00 min · Paid waiting 20 min · Unpaid 40 min')).toBeInTheDocument()

      // Money not linked to a job
      expect(screen.getByText('€2.00 paid that is not linked to a job')).toBeInTheDocument()
    })

    it('shows weeks newest first and omits (so far) on a completed week', () => {
      const olderWeek = makeWeek('2026-11-09', { soFar: false })
      const newerWeek = makeWeek('2026-11-16', { soFar: false })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-09',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-16')],
          weeks: [olderWeek, newerWeek], // API returns ascending
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      const headerNewer = screen.getByText('Week Mon, 16 Nov 2026 to Sun, 22 Nov 2026')
      const headerOlder = screen.getByText('Week Mon, 9 Nov 2026 to Sun, 15 Nov 2026')
      expect(headerNewer).toBeInTheDocument()
      expect(headerOlder).toBeInTheDocument()
      expect(screen.queryByText(/\(so far\)/)).toBeNull()

      // Newest first order
      expect(headerNewer.compareDocumentPosition(headerOlder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('shows day figures for days with work or money, singular drop off and wait, and hides 0 noJobMoney', () => {
      const activeDay = makeDay('2026-11-19', {
        moneyCents: 1000,
        dropOffCount: 1, // singular drop off
        workSeconds: 3600,
        centsPerHour: 1000,
        activeCentsPerHour: 1200,
        centsPerPaidKm: 250,
        medianPickupWaitSeconds: 60, // 1 min
        pickupWaitCount: 1, // singular wait
        noJobMoneyCents: 0, // 0 -> line must NOT appear
      })
      const emptyDay = makeDay('2026-11-18', {
        workSeconds: 0,
        moneyCents: 0,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-18',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [emptyDay, activeDay],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Active day is shown
      expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
      expect(screen.getByText(/€10.00 · 1 drop off · 1 h 00 min worked/)).toBeInTheDocument()
      expect(
        screen.getByText(
          /€10.00 per hour worked · €12.00 per hour on a job · €2.50 per paid km · typical pickup wait 1 min \(1 wait\)/
        )
      ).toBeInTheDocument()

      // Empty day is skipped
      expect(screen.queryByText('Wed, 18 Nov 2026')).toBeNull()

      // noJobMoneyCents is 0, line must not show
      expect(screen.queryByText(/paid that is not linked to a job/)).toBeNull()
    })

    it('renders em dash "—" for each null rate and null median wait', () => {
      const dayWithNulls = makeDay('2026-11-19', {
        centsPerHour: null,
        activeCentsPerHour: null,
        centsPerPaidKm: null,
        medianPickupWaitSeconds: null,
        pickupWaitCount: 0,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [dayWithNulls],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(
        screen.getByText(/— per hour worked · — per hour on a job · — per paid km · typical pickup wait —/)
      ).toBeInTheDocument()
    })
  })

  // --- AC-15, AC-8: Day's Job Rows ---
  describe('AC-15, AC-8: Day job rows', () => {
    it('lists jobs accepted that Athens day in accept time order, each linking to /deliveries/<id>', () => {
      // Job 1 at 10:10 UTC (12:10 Athens) inside shift
      const job1 = makeJob('del-1', {
        pickupName: 'Taverna Nikos',
        dropoffArea: 'Syntagma',
        acceptedAt: '2026-11-19T10:10:00.000Z',
        endedAt: '2026-11-19T10:30:00.000Z', // 20 min
        paidKm: 3.2,
        deliveryMoneyCents: 500,
        compensations: [{ id: 'c1', reason: 'WAITING', amountCents: 150, createdAt: '2026-11-19T10:40:00Z', addedLater: false }],
        endLabel: null, // delivered
      })

      // Job 2 at 10:40 UTC (12:40 Athens) in no shift
      const job2 = makeJob('del-2', {
        pickupName: 'Acropolis Grill',
        dropoffArea: 'Koukaki',
        acceptedAt: '2026-11-19T10:40:00.000Z',
        endedAt: '2026-11-19T11:05:00.000Z', // 25 min
        paidKm: 1.8,
        deliveryMoneyCents: 400,
        compensations: [],
        endLabel: 'CANCELLED_AFTER_PICKUP',
      })

      const shift = makeShift('2026-11-19T10:00:00.000Z', {
        jobs: [job1],
      })
      const day = makeDay('2026-11-19')

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [day],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [job2],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Jobs accepted this day')).toBeInTheDocument()

      // Job 1 (delivered, deliveryMoney 500 + comp 150 = 650 -> €6.50)
      const link1 = screen.getByRole('link', { name: 'Taverna Nikos → Syntagma' })
      expect(link1).toHaveAttribute('href', '/deliveries/del-1')
      expect(screen.getByText('12:10')).toBeInTheDocument()
      expect(screen.getByText(/3.2 km · 20 min/)).toBeInTheDocument()
      expect(screen.getByText('€6.50')).toBeInTheDocument()

      // Job 2 (not in a recorded shift, cancelled after pickup)
      const link2 = screen.getByRole('link', { name: 'Acropolis Grill → Koukaki' })
      expect(link2).toHaveAttribute('href', '/deliveries/del-2')
      expect(screen.getByText('12:40')).toBeInTheDocument()
      expect(screen.getByText(/1.8 km · 25 min · Cancelled after pickup · not in a recorded shift/)).toBeInTheDocument()
      expect(screen.getByText('€4.00')).toBeInTheDocument()

      // Order: job1 before job2
      expect(link1.compareDocumentPosition(link2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('renders "—" for missing dropoffArea and missing paidKm', () => {
      const job = makeJob('del-nulls', {
        pickupName: 'Athens Pita',
        dropoffArea: null,
        paidKm: null,
        acceptedAt: '2026-11-19T10:00:00.000Z',
        endedAt: '2026-11-19T10:15:00.000Z',
      })

      const day = makeDay('2026-11-19')

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [day],
          weeks: [],
          shifts: [],
          jobsInNoShift: [job],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      const link = screen.getByRole('link', { name: 'Athens Pita → —' })
      expect(link).toHaveAttribute('href', '/deliveries/del-nulls')
      expect(screen.getByText(/— · 15 min/)).toBeInTheDocument()
    })

    it('displays the correct end label for every JobEndLabel', () => {
      const labels: { label: JobEndLabel; text: string }[] = [
        { label: 'CANCELLED_AFTER_PICKUP', text: 'Cancelled after pickup' },
        { label: 'CANCELLED', text: 'Cancelled' },
        { label: 'REMOVED', text: 'Removed' },
        { label: 'HANDED_BACK', text: 'Handed back' },
        { label: 'REASSIGNED', text: 'Reassigned' },
        { label: 'FAILED', text: 'Failed' },
        { label: 'ENDED', text: 'Ended' },
        { label: 'IN_PROGRESS', text: 'In progress' },
      ]

      const jobs = labels.map(({ label }, idx) =>
        makeJob(`del-label-${idx}`, {
          pickupName: `Place ${idx}`,
          acceptedAt: `2026-11-19T${String(10 + Math.floor(idx / 60)).padStart(2, '0')}:${String(idx % 60).padStart(2, '0')}:00.000Z`,
          endLabel: label,
        })
      )

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [],
          jobsInNoShift: jobs,
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      for (const { text } of labels) {
        expect(screen.getByText(new RegExp(`· ${text} · not in a recorded shift`))).toBeInTheDocument()
      }
    })

    it('does not show "Jobs accepted this day" heading when day has 0 jobs', () => {
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.queryByText('Jobs accepted this day')).toBeNull()
    })

    it('places a job accepted at 22:30 UTC under the NEXT Athens day heading, not the UTC day (AC-2, AC-8, review minor 5)', () => {
      // 22:30 UTC on 2026-11-18 is 00:30 Athens on 2026-11-19
      const midnightJob = makeJob('del-midnight', {
        pickupName: 'Midnight Souvlaki',
        dropoffArea: 'Syntagma',
        acceptedAt: '2026-11-18T22:30:00.000Z',
      })
      const day18 = makeDay('2026-11-18')
      const day19 = makeDay('2026-11-19')

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-18',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [day18, day19],
          weeks: [],
          shifts: [],
          jobsInNoShift: [midnightJob],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      const thuHeading = screen.getByText('Thu, 19 Nov 2026')
      const wedHeading = screen.getByText('Wed, 18 Nov 2026')
      const jobLink = screen.getByRole('link', { name: 'Midnight Souvlaki → Syntagma' })

      // Job accept time in Athens time is 00:30
      expect(screen.getByText('00:30')).toBeInTheDocument()

      // Days are rendered newest first (Thu 19 Nov before Wed 18 Nov).
      // The job belongs to Athens day 19 Nov, so it must appear after Thu heading and before Wed heading.
      expect(thuHeading.compareDocumentPosition(jobLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(jobLink.compareDocumentPosition(wedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('orders rows by accept time across shift jobs and jobs in no shift (AC-8, review minor 6)', () => {
      // Shift job accepted at 10:40 UTC (12:40 Athens)
      const shiftJob = makeJob('del-shift-later', {
        pickupName: 'Shift Taverna',
        dropoffArea: 'Syntagma',
        acceptedAt: '2026-11-19T10:40:00.000Z',
      })
      // No-shift job accepted earlier at 10:10 UTC (12:10 Athens)
      const noShiftJob = makeJob('del-noshift-earlier', {
        pickupName: 'No Shift Souvlaki',
        dropoffArea: 'Koukaki',
        acceptedAt: '2026-11-19T10:10:00.000Z',
      })
      const shift = makeShift('2026-11-19T10:00:00.000Z', {
        jobs: [shiftJob],
      })
      const day = makeDay('2026-11-19')

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [day],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [noShiftJob],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      const shiftLink = screen.getByRole('link', { name: 'Shift Taverna → Syntagma' })
      const noShiftLink = screen.getByRole('link', { name: 'No Shift Souvlaki → Koukaki' })

      // No-shift job (10:10) must appear before shift job (10:40)
      expect(noShiftLink.compareDocumentPosition(shiftLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('shows day heading and job row for €0 job in no shift on a day with no work or money, and does not say "No time worked in these days" (AC-8, review minor 1)', () => {
      // Day with no work and no money (all figures 0 or null)
      const zeroDay = makeDay('2026-11-19', {
        workSeconds: 0,
        jobSeconds: 0,
        paidWaitSeconds: 0,
        unpaidSeconds: 0,
        moneyCents: 0,
        unlinkedMoneyCents: 0,
        noJobMoneyCents: 0,
        centsPerHour: null,
        activeCentsPerHour: null,
        paidKm: 0,
        centsPerPaidKm: null,
        medianPickupWaitSeconds: null,
        pickupWaitCount: 0,
        dropOffCount: 0,
      })

      // Job in jobsInNoShift that earned nothing (€0 delivery money, no compensations)
      const zeroJob = makeJob('del-zero-money', {
        pickupName: 'Cancelled Bistro',
        dropoffArea: 'Syntagma',
        acceptedAt: '2026-11-19T10:00:00.000Z',
        endedAt: '2026-11-19T10:15:00.000Z',
        deliveryMoneyCents: 0,
        compensations: [],
        endLabel: 'CANCELLED',
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [zeroDay],
          weeks: [],
          shifts: [],
          jobsInNoShift: [zeroJob],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // When the €0 job is the only thing in the range, the card must NOT say "No time worked in these days."
      expect(screen.queryByText('No time worked in these days.')).toBeNull()

      // The day heading must be displayed
      expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()

      // The job row must be displayed, showing €0.00
      const link = screen.getByRole('link', { name: 'Cancelled Bistro → Syntagma' })
      expect(link).toHaveAttribute('href', '/deliveries/del-zero-money')
      expect(screen.getByText('€0.00')).toBeInTheDocument()
      expect(screen.getByText(/Cancelled · not in a recorded shift/)).toBeInTheDocument()
    })

    it('shows raw code for unknown endLabel and never displays "undefined" (review minor 2)', () => {
      // Backend added a new label before adminweb SDK knows it
      const jobWithUnknownLabel = makeJob('del-unknown-label', {
        pickupName: 'New Restaurant',
        dropoffArea: 'Syntagma',
        endLabel: 'SOMETHING_NEW' as JobEndLabel,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [],
          jobsInNoShift: [jobWithUnknownLabel],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Displays " · SOMETHING_NEW" and NEVER "undefined"
      expect(screen.getByText(/· SOMETHING_NEW/)).toBeInTheDocument()
      expect(screen.queryByText(/undefined/)).toBeNull()
    })
  })

  // --- AC-15: Range with no reach limit ---
  describe('AC-15: Range with no reach limit', () => {
    it('requests chosen old range beyond 2 calendar months and renders its figures and rows', () => {
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-05-01',
          to: '2026-05-15',
          recordedFrom: '2026-01-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [
            makeDay('2026-05-10', {
              moneyCents: 5000,
              workSeconds: 7200,
            }),
          ],
          weeks: [makeWeek('2026-05-04')],
          shifts: [],
          jobsInNoShift: [
            makeJob('del-old-1', {
              pickupName: 'Old Town Souvlaki',
              acceptedAt: '2026-05-10T11:00:00.000Z',
            }),
          ],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Change form to dates older than 2 months (May 2026, when today is Nov 2026)
      const fromInput = screen.getByLabelText('From')
      const toInput = screen.getByLabelText('To')
      const showButton = screen.getByRole('button', { name: 'Show' })

      fireEvent.change(fromInput, { target: { value: '2026-05-01' } })
      fireEvent.change(toInput, { target: { value: '2026-05-15' } })
      fireEvent.click(showButton)

      // Query called with older dates with no reach limit
      expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
        { courierId: 'courier-c1', from: '2026-05-01', to: '2026-05-15' },
        { skip: false, pollingInterval: 0 }
      )

      // Old figures and rows are rendered
      expect(screen.getByText('Sun, 10 May 2026')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Old Town Souvlaki → Syntagma' })).toBeInTheDocument()
    })
  })

  // --- AC-16: No comparison, no averages, no colour/threshold styling ---
  describe('AC-16: No comparison across riders and no colour/threshold on figures', () => {
    it('shows no average across riders, fleet comparison, or peer ranking', () => {
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-18',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-18'), makeDay('2026-11-19')],
          weeks: [makeWeek('2026-11-16')],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // 1. No mention of average, ranking, peer, fleet or other riders
      expect(screen.queryByText(/average/i)).toBeNull()
      expect(screen.queryByText(/fleet/i)).toBeNull()
      expect(screen.queryByText(/peer/i)).toBeNull()
      expect(screen.queryByText(/rank/i)).toBeNull()
      expect(screen.queryByText(/compare/i)).toBeNull()
    })

    it('renders a week and a day with low and high figures with plain text only: no colour/threshold/mark classes, no aria-invalid or data-state, and identical class lists across figures', () => {
      // Week and day with low figures: centsPerHour 500 (€5.00/h), long pickup wait (1200 s / 20 min)
      const lowWeek = makeWeek('2026-11-09', {
        moneyCents: 1500,
        workSeconds: 10800,
        centsPerHour: 500,
        activeCentsPerHour: 600,
        centsPerPaidKm: 100,
        medianPickupWaitSeconds: 1200,
        pickupWaitCount: 5,
      })
      const lowDay = makeDay('2026-11-18', {
        moneyCents: 1500,
        workSeconds: 10800,
        centsPerHour: 500,
        activeCentsPerHour: 600,
        centsPerPaidKm: 100,
        medianPickupWaitSeconds: 1200,
        pickupWaitCount: 5,
      })

      // Week and day with high figures: centsPerHour 5000 (€50.00/h), short pickup wait (60 s / 1 min)
      const highWeek = makeWeek('2026-11-16', {
        moneyCents: 15000,
        workSeconds: 10800,
        centsPerHour: 5000,
        activeCentsPerHour: 6000,
        centsPerPaidKm: 600,
        medianPickupWaitSeconds: 60,
        pickupWaitCount: 1,
      })
      const highDay = makeDay('2026-11-19', {
        moneyCents: 15000,
        workSeconds: 10800,
        centsPerHour: 5000,
        activeCentsPerHour: 6000,
        centsPerPaidKm: 600,
        medianPickupWaitSeconds: 60,
        pickupWaitCount: 1,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-09',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [lowDay, highDay],
          weeks: [lowWeek, highWeek],
          shifts: [],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      const { container } = render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // 1. Elements around two different figures have identical class lists and attributes
      const lowRateElements = screen.getAllByText(/€5\.00 per hour worked/)
      const highRateElements = screen.getAllByText(/€50\.00 per hour worked/)
      expect(lowRateElements).toHaveLength(2) // lowWeek, lowDay
      expect(highRateElements).toHaveLength(2) // highWeek, highDay

      const lowWeekRates = lowRateElements[0] as HTMLElement
      const lowDayRates = lowRateElements[1] as HTMLElement
      const highWeekRates = highRateElements[0] as HTMLElement
      const highDayRates = highRateElements[1] as HTMLElement

      // Elements around figures must have identical class lists
      expect(Array.from(lowWeekRates.classList).sort()).toEqual(Array.from(highWeekRates.classList).sort())
      expect(Array.from(lowDayRates.classList).sort()).toEqual(Array.from(highDayRates.classList).sort())
      expect(Array.from(lowDayRates.classList).sort()).toEqual(Array.from(lowWeekRates.classList).sort())

      // Elements around figures must have identical attributes (no aria-invalid or data-state set by value)
      expect(lowWeekRates.getAttribute('class')).toBe(highWeekRates.getAttribute('class'))
      expect(lowDayRates.getAttribute('class')).toBe(highDayRates.getAttribute('class'))
      expect(lowWeekRates.getAttribute('aria-invalid')).toBe(highWeekRates.getAttribute('aria-invalid'))
      expect(lowDayRates.getAttribute('aria-invalid')).toBe(highDayRates.getAttribute('aria-invalid'))
      expect(lowWeekRates.getAttribute('data-state')).toBe(highWeekRates.getAttribute('data-state'))
      expect(lowDayRates.getAttribute('data-state')).toBe(highDayRates.getAttribute('data-state'))

      // Also verify period totals paragraphs around figures match class lists
      const lowTotalsElements = screen.getAllByText(/€15\.00 · 3 drop offs · 3 h 00 min worked/)
      const highTotalsElements = screen.getAllByText(/€150\.00 · 3 drop offs · 3 h 00 min worked/)
      expect(lowTotalsElements).toHaveLength(2)
      expect(highTotalsElements).toHaveLength(2)
      const lowTotal0 = lowTotalsElements[0] as HTMLElement
      const lowTotal1 = lowTotalsElements[1] as HTMLElement
      const highTotal0 = highTotalsElements[0] as HTMLElement
      const highTotal1 = highTotalsElements[1] as HTMLElement
      expect(Array.from(lowTotal0.classList).sort()).toEqual(Array.from(highTotal0.classList).sort())
      expect(Array.from(lowTotal1.classList).sort()).toEqual(Array.from(highTotal1.classList).sort())

      // 2. Fails if any element of the card carries a colour, threshold or mark class:
      // (text-destructive, text-red-*, text-green-*, text-amber-*, text-warning, text-success,
      // bg-red-*, bg-green-*, any class containing "destructive", "danger", "warning" or "success")
      // or an attribute such as aria-invalid or data-state set by a figure's value.
      const FORBIDDEN_CLASS_PATTERN =
        /^(text-(destructive|warning|success|red(-.*)?|green(-.*)?|amber(-.*)?)|bg-(red(-.*)?|green(-.*)?))$/i
      const FORBIDDEN_SUBSTRING_PATTERN = /destructive|danger|warning|success/i

      const allElements = Array.from(container.querySelectorAll('*'))
      for (const el of allElements) {
        const classAttr = el.getAttribute('class') || ''
        const tokens = classAttr.split(/\s+/).filter(Boolean)
        for (const token of tokens) {
          expect(token).not.toMatch(FORBIDDEN_CLASS_PATTERN)
          expect(token).not.toMatch(FORBIDDEN_SUBSTRING_PATTERN)
        }
        expect(el.getAttribute('aria-invalid')).toBeNull()
        expect(el.getAttribute('data-state')).toBeNull()
      }
    })
  })

  // --- Preserved spec 0040 AC-15 assertions ---
  describe('Preserved spec 0040 AC-15 assertions (shifts, breaks, status changes, form, polling, states)', () => {
    it('calls getCourierTimeWorked with rider id, last 7 Athens days and pollingInterval by default', () => {
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
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

    it('renders shifts with split, break in Athens time, started before these days, and late money', () => {
      const shift = makeShift('2026-11-19T12:00:00.000Z', {
        startedBeforeRange: true,
        endedAt: '2026-11-19T15:00:00.000Z', // 17:00 Athens
        breaks: [
          {
            startedAt: '2026-11-19T13:00:00.000Z', // 15:00 Athens
            endedAt: '2026-11-19T13:20:00.000Z', // 15:20 Athens
          },
        ],
        lateMoneyCents: 500,
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
      expect(screen.getByText('Started before these days')).toBeInTheDocument()
      expect(screen.getByText(/€5.00 of it added later/)).toBeInTheDocument()
      expect(screen.getByText('Break 15:00 to 15:20')).toBeInTheDocument()
    })

    it('renders records behind the shift: status changes with admin label, and rider status change', () => {
      const shift = makeShift('2026-11-19T10:00:00.000Z', {
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
        jobs: [], // Jobs no longer listed inside shift records
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Records behind this shift')).toBeInTheDocument()
      expect(
        screen.getByText((content) =>
          content.includes('Offline to Online, by an admin (coordinator@volos.coop)')
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText((content) =>
          content.includes('Online to Offline, by the rider')
        )
      ).toBeInTheDocument()
    })

    it('renders admin label on CUT_OFF change, and falls back to code for unknown status or cause', () => {
      const shift = makeShift('2026-11-19T10:00:00.000Z', {
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
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(
        screen.getByText((content) =>
          content.includes('Online to Offline, by a password change (admin@example.com)')
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText((content) =>
          content.includes('MY_FUTURE_STATUS to Online, MY_FUTURE_CAUSE')
        )
      ).toBeInTheDocument()
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

    it('places a shift under the Athens day it started on (2026-11-18T22:30:00Z sits under Thu 19 Nov)', () => {
      const shift = makeShift('2026-11-18T22:30:00.000Z', {
        endedAt: '2026-11-18T23:30:00.000Z',
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Thu, 19 Nov 2026')).toBeInTheDocument()
      expect(screen.getByText(/Thu 19 Nov, 00:30 to 01:30/)).toBeInTheDocument()
      expect(screen.queryByText('Began before these days')).toBeNull()
    })

    it('renders shifts that began before the first day block under "Began before these days", newest first', () => {
      const shift19 = makeShift('2026-11-19T10:00:00.000Z', { endedAt: '2026-11-19T11:00:00.000Z' })
      const shift17 = makeShift('2026-11-17T10:00:00.000Z', {
        startedBeforeRange: true,
        endedAt: '2026-11-17T12:00:00.000Z',
      })
      const shift18 = makeShift('2026-11-18T10:00:00.000Z', {
        startedBeforeRange: true,
        endedAt: '2026-11-18T12:00:00.000Z',
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift19, shift17, shift18],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Began before these days')).toBeInTheDocument()
      const text18 = screen.getByText(/Wed 18 Nov, 12:00 to 14:00/)
      const text17 = screen.getByText(/Tue 17 Nov, 12:00 to 14:00/)
      expect(text18.compareDocumentPosition(text17) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('renders two days and two shifts in newest first order', () => {
      const day18 = makeDay('2026-11-18')
      const day19 = makeDay('2026-11-19')

      const shiftOlder = makeShift('2026-11-19T08:00:00.000Z', { endedAt: '2026-11-19T09:00:00.000Z' }) // 10:00 Athens
      const shiftNewer = makeShift('2026-11-19T14:00:00.000Z', { endedAt: '2026-11-19T15:00:00.000Z' }) // 16:00 Athens

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-18',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [day18, day19],
          weeks: [],
          shifts: [shiftOlder, shiftNewer],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      const d19 = screen.getByText('Thu, 19 Nov 2026')
      const d18 = screen.getByText('Wed, 18 Nov 2026')
      expect(d19.compareDocumentPosition(d18) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

      const sNewer = screen.getByText(/Thu 19 Nov, 16:00 to 17:00/)
      const sOlder = screen.getByText(/Thu 19 Nov, 10:00 to 11:00/)
      expect(sNewer.compareDocumentPosition(sOlder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('renders open shift and break since', () => {
      const openShift = makeShift('2026-11-19T10:00:00.000Z', {
        endedAt: null,
        onBreakSince: '2026-11-19T10:20:00.000Z',
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [openShift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText(/still open/)).toBeInTheDocument()
      expect(screen.getByText(/\(on a break since 12:20\)/)).toBeInTheDocument()
    })

    it('shows end date when shift ends past midnight and time only for same day', () => {
      const crossDayShift = makeShift('2026-11-19T20:00:00.000Z', {
        endedAt: '2026-11-21T07:00:00.000Z', // Sat 21 Nov 09:00 Athens
      })
      const sameDayShift = makeShift('2026-11-19T10:00:00.000Z', {
        endedAt: '2026-11-19T12:00:00.000Z', // Thu 19 Nov 14:00 Athens
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-19',
          to: '2026-11-19',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [crossDayShift, sameDayShift],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText(/Thu 19 Nov, 22:00 to Sat 21 Nov, 09:00/)).toBeInTheDocument()
      expect(screen.getByText(/Thu 19 Nov, 12:00 to 14:00/)).toBeInTheDocument()
    })

    it('polls with pollingInterval when range includes today, and sets pollingInterval 0 when range ends before today', () => {
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: { recordedFrom: null, currencyCode: 'EUR', days: [], weeks: [], shifts: [], jobsInNoShift: [] },
        isLoading: false,
      })

      const today = athensToday()
      const defaultFrom = addDays(today, -6)

      render(<CourierTimeWorkedCard courierId="courier-c1" pollingInterval={30000} />)

      expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
        { courierId: 'courier-c1', from: defaultFrom, to: today },
        { skip: false, pollingInterval: 30000 }
      )

      mockUseGetCourierTimeWorkedQuery.mockClear()

      const yesterday = addDays(today, -1)
      const pastFrom = addDays(today, -7)

      const fromInput = screen.getByLabelText('From')
      const toInput = screen.getByLabelText('To')
      const showButton = screen.getByRole('button', { name: 'Show' })

      fireEvent.change(fromInput, { target: { value: pastFrom } })
      fireEvent.change(toInput, { target: { value: yesterday } })
      fireEvent.click(showButton)

      expect(mockUseGetCourierTimeWorkedQuery).toHaveBeenCalledWith(
        { courierId: 'courier-c1', from: pastFrom, to: yesterday },
        { skip: false, pollingInterval: 0 }
      )
    })

    it('renders loading, error, empty, and recordedFrom states', () => {
      // Loading
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: undefined,
        isLoading: true,
        isFetching: false,
      })
      const { rerender } = render(<CourierTimeWorkedCard courierId="courier-c1" />)
      expect(screen.getByText('Loading…')).toBeInTheDocument()

      // Error
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })
      rerender(<CourierTimeWorkedCard courierId="courier-c1" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the time worked.')

      // Empty with null recordedFrom
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          recordedFrom: null,
          currencyCode: 'EUR',
          days: [],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })
      rerender(<CourierTimeWorkedCard courierId="courier-c1" />)
      expect(screen.getByText('No time worked in these days.')).toBeInTheDocument()
      expect(screen.getByText('Time worked is recorded from today.')).toBeInTheDocument()

      // Empty with set recordedFrom
      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [],
          weeks: [],
          shifts: [],
          jobsInNoShift: [],
        },
        isLoading: false,
        isFetching: false,
      })
      rerender(<CourierTimeWorkedCard courierId="courier-c1" />)
      expect(screen.getByText('Time worked is recorded from Sun, 1 Nov 2026.')).toBeInTheDocument()
    })
  })

  // --- Row 122: Break under a minute wording on the courier card ---
  describe('row 122: break under a minute wording on the courier card', () => {
    it('words a break under a minute as "Break at HH:MM, under a minute" in Athens time and never shows the same minute wording', () => {
      // Break from 23:35:10 UTC to 23:35:40 UTC (30s) on 2026-11-19.
      // In Athens time (UTC+2 in winter), this is 01:35:10 to 01:35:40 on 2026-11-20.
      // UTC hour (23) and Athens hour (01) differ, testing timezone formatting under any TZ.
      const shift = makeShift('2026-11-19T23:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: '2026-11-19T23:35:10.000Z',
            endedAt: '2026-11-19T23:35:40.000Z',
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-20')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Clause 1: reads "Break at HH:MM, under a minute" in Athens time (01:35)
      expect(screen.getByText('Break at 01:35, under a minute')).toBeInTheDocument()

      // Clause 3: fails if the same minute wording ("Break 01:35 to 01:35") comes back
      expect(screen.queryByText('Break 01:35 to 01:35')).toBeNull()

      // Proves Athens time was formatted, not UTC (23:35)
      expect(screen.queryByText(/23:35/)).toBeNull()
    })

    it('pins the threshold from the lower side: a 59 second break reads "Break at HH:MM, under a minute" and NOT as a normal break', () => {
      // 59 second break (59_000 ms, 01:35:00 to 01:35:59 Athens)
      const shift = makeShift('2026-11-19T23:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: '2026-11-19T23:35:00.000Z',
            endedAt: '2026-11-19T23:35:59.000Z',
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-20')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // 59 seconds is under a minute -> words as short break
      expect(screen.getByText('Break at 01:35, under a minute')).toBeInTheDocument()

      // Fails if a 59 second break reads as a normal one
      expect(screen.queryByText('Break 01:35 to 01:35')).toBeNull()
    })

    it('pins the threshold from the upper side: an exactly 60 second break reads as a normal break and NOT "under a minute"', () => {
      // Exactly 60 second break (60_000 ms, 01:35:00 to 01:36:00 Athens)
      const shift = makeShift('2026-11-19T23:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: '2026-11-19T23:35:00.000Z',
            endedAt: '2026-11-19T23:36:00.000Z',
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-20')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Clause 2: exactly 60 seconds reads as before: "Break HH:MM to HH:MM"
      expect(screen.getByText('Break 01:35 to 01:36')).toBeInTheDocument()

      // Fails if threshold moved to <= 60_000
      expect(screen.queryByText(/under a minute/)).toBeNull()
    })

    it('renders longer breaks (over 60 seconds) as before: "Break HH:MM to HH:MM"', () => {
      // 15 minute break (01:10 to 01:25 Athens)
      const shift = makeShift('2026-11-19T23:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: '2026-11-19T23:10:00.000Z',
            endedAt: '2026-11-19T23:25:00.000Z',
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-20')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      expect(screen.getByText('Break 01:10 to 01:25')).toBeInTheDocument()
      expect(screen.queryByText(/under a minute/)).toBeNull()
    })

    it('never hides a short break: renders its own line alongside other breaks in the shift', () => {
      // Shift with both a normal break and a short break under a minute
      const shift = makeShift('2026-11-19T23:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: '2026-11-19T23:10:00.000Z',
            endedAt: '2026-11-19T23:25:00.000Z', // 15 min
          },
          {
            startedAt: '2026-11-19T23:35:10.000Z',
            endedAt: '2026-11-19T23:35:40.000Z', // 30 sec
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-20')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Both break lines must be present in the document
      const normalBreak = screen.getByText('Break 01:10 to 01:25')
      const shortBreak = screen.getByText('Break at 01:35, under a minute')

      expect(normalBreak).toBeInTheDocument()
      expect(shortBreak).toBeInTheDocument()

      // The line is never hidden: short break renders its own line in order
      expect(normalBreak.compareDocumentPosition(shortBreak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('includes the date when a short break falls on another Athens day than the shift start', () => {
      // Shift starts at 21:00 UTC (23:00 Athens) on 2026-11-19.
      // Break is at 22:20 UTC (00:20 Athens) on 2026-11-20, lasting 30 seconds (under a minute).
      // Because the break starts on the next Athens day, athensEnd includes the date.
      const breakStartedAt = '2026-11-19T22:20:10.000Z'
      const shift = makeShift('2026-11-19T21:00:00.000Z', {
        endedAt: '2026-11-20T03:00:00.000Z',
        breaks: [
          {
            startedAt: breakStartedAt,
            endedAt: '2026-11-19T22:20:40.000Z',
          },
        ],
      })

      mockUseGetCourierTimeWorkedQuery.mockReturnValue({
        currentData: {
          from: '2026-11-14',
          to: '2026-11-20',
          recordedFrom: '2026-11-01T00:00:00Z',
          currencyCode: 'EUR',
          days: [makeDay('2026-11-19')],
          weeks: [],
          shifts: [shift],
          jobsInNoShift: [],
        } as CourierTimeWorkedDto,
        isLoading: false,
        isFetching: false,
      })

      render(<CourierTimeWorkedCard courierId="courier-c1" />)

      // Expected format: "Break at Fri 20 Nov, 00:20, under a minute"
      const expectedText = `Break at ${athensDateTime(breakStartedAt)}, under a minute`
      expect(expectedText).toBe('Break at Fri 20 Nov, 00:20, under a minute')
      expect(screen.getByText(expectedText)).toBeInTheDocument()

      // Must not render as a range break ("Break ... to ...")
      expect(screen.queryByText(/Break .* to /)).toBeNull()
    })
  })
})
