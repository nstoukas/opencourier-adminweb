import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PartnerWaitRecordCard } from './PartnerWaitRecordCard'
import { useGetPartnerWaitRecordQuery, useUpdatePartnerMutation } from '../../../api/partnersApi'
import type { PartnerWaitRecordAdminDto } from '../../../backend-admin-sdk'

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../../api/partnersApi', () => ({
  useGetPartnerWaitRecordQuery: jest.fn(),
  useUpdatePartnerMutation: jest.fn(),
}))

const mockUseGetPartnerWaitRecordQuery = useGetPartnerWaitRecordQuery as jest.Mock
const mockUseUpdatePartnerMutation = useUpdatePartnerMutation as jest.Mock

describe('PartnerWaitRecordCard (spec 0030, AC-7)', () => {
  let mockUpdateTrigger: jest.Mock

  const sampleRecord: PartnerWaitRecordAdminDto = {
    days: 30,
    orderCount: 42,
    waitSamples: 38,
    averageWaitMinutes: 6.5,
    lateShare: 0.12,
    prepSamples: 35,
    medianPrepMinutes: 22,
    usualPrepMinutes: 15,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateTrigger = jest.fn().mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ id: 'p-1', usualPrepMinutes: 22 }),
    })
    mockUseUpdatePartnerMutation.mockReturnValue([mockUpdateTrigger, { isLoading: false }])
    mockUseGetPartnerWaitRecordQuery.mockReturnValue({
      currentData: sampleRecord,
      isLoading: false,
      isError: false,
    })
  })

  describe('Card structure and period selection (AC-7)', () => {
    it('renders the Wait record card heading and the three period buttons', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByRole('heading', { level: 3, name: 'Wait record' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '7 days' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '30 days' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '90 days' })).toBeInTheDocument()
    })

    it('defaults to 30 days on initial render', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      // Initial query must be for 30 days
      expect(mockUseGetPartnerWaitRecordQuery).toHaveBeenCalledWith({ id: 'p-1', days: 30 })
    })

    it('switches to 7 days when the 7 days button is clicked', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      fireEvent.click(screen.getByRole('button', { name: '7 days' }))

      expect(mockUseGetPartnerWaitRecordQuery).toHaveBeenLastCalledWith({ id: 'p-1', days: 7 })
    })

    it('switches to 90 days when the 90 days button is clicked', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      fireEvent.click(screen.getByRole('button', { name: '90 days' }))

      expect(mockUseGetPartnerWaitRecordQuery).toHaveBeenLastCalledWith({ id: 'p-1', days: 90 })
    })
  })

  describe('Figures display (AC-6, AC-7)', () => {
    it('displays the average rider wait, late order percentage, and real prep time', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      // Average wait
      expect(screen.getByText('Riders waited past ready')).toBeInTheDocument()
      expect(screen.getByText('6.5 min on average')).toBeInTheDocument()

      // Late share (0.12 -> 12%)
      expect(screen.getByText('Orders that ran late')).toBeInTheDocument()
      expect(screen.getByText('12%')).toBeInTheDocument()

      // Real prep time (median)
      expect(screen.getByText('Real prep time')).toBeInTheDocument()
      expect(screen.getByText('22 min')).toBeInTheDocument()
    })

    it('rounds late share to the nearest whole percentage', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          lateShare: 0.166, // 16.6% -> rounds to 17%
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByText('17%')).toBeInTheDocument()
    })

    it('never renders rider names, rider IDs, or per-rider breakdown (value 5 / AC-6)', () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      const card = screen.getByTestId('wait-record')
      expect(card).not.toHaveTextContent(/courier/i)
      // The only mention is the label "Riders waited past ready", never an individual rider
      expect(within(card).queryByText(/courierId/i)).toBeNull()
    })
  })

  describe('Null figures handling ("Not enough orders yet", AC-7)', () => {
    it('shows "Not enough orders yet" when averageWaitMinutes is null', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          averageWaitMinutes: null,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByText('Not enough orders yet')).toBeInTheDocument()
      expect(screen.getByText('12%')).toBeInTheDocument()
      expect(screen.getByText('22 min')).toBeInTheDocument()
    })

    it('shows "Not enough orders yet" when lateShare is null', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          lateShare: null,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByText('6.5 min on average')).toBeInTheDocument()
      expect(screen.getByText('Not enough orders yet')).toBeInTheDocument()
      expect(screen.getByText('22 min')).toBeInTheDocument()
    })

    it('shows "Not enough orders yet" when medianPrepMinutes is null', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: null,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByText('6.5 min on average')).toBeInTheDocument()
      expect(screen.getByText('12%')).toBeInTheDocument()
      expect(screen.getByText('Not enough orders yet')).toBeInTheDocument()
    })

    it('shows "Not enough orders yet" for all three figures when all are null', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          orderCount: 0,
          waitSamples: 0,
          averageWaitMinutes: null,
          lateShare: null,
          prepSamples: 0,
          medianPrepMinutes: null,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      const placeholders = screen.getAllByText('Not enough orders yet')
      expect(placeholders).toHaveLength(3)
    })
  })

  describe('Adopt real prep time button visibility (AC-7)', () => {
    it('shows adopt button when median is between 0 and 90 and differs from usualPrepMinutes', () => {
      // median = 22, usual = 15
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      const adoptButton = screen.getByRole('button', { name: 'Use 22 min as the usual prep time' })
      expect(adoptButton).toBeInTheDocument()
    })

    it('shows adopt button at lower boundary: median is 0 and usual is 15', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: 0,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByRole('button', { name: 'Use 0 min as the usual prep time' })).toBeInTheDocument()
    })

    it('shows adopt button at upper boundary: median is 90 and usual is 15', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: 90,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByRole('button', { name: 'Use 90 min as the usual prep time' })).toBeInTheDocument()
    })

    it('does NOT show adopt button when median equals usualPrepMinutes', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: 15,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.queryByRole('button', { name: /Use \d+ min as the usual prep time/ })).toBeNull()
    })

    it('does NOT show adopt button when median is null', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: null,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.queryByRole('button', { name: /Use \d+ min as the usual prep time/ })).toBeNull()
    })

    it('does NOT show adopt button when median is negative (< 0)', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: -1,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.queryByRole('button', { name: /Use .* as the usual prep time/ })).toBeNull()
    })

    it('does NOT show adopt button when median exceeds 90 minutes (> 90)', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: {
          ...sampleRecord,
          medianPrepMinutes: 91,
          usualPrepMinutes: 15,
        },
        isLoading: false,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.queryByRole('button', { name: /Use .* as the usual prep time/ })).toBeNull()
    })

    it('does NOT show adopt button when record is undefined (loading)', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: undefined,
        isLoading: true,
        isError: false,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.queryByRole('button', { name: /Use .* as the usual prep time/ })).toBeNull()
    })
  })

  describe('Adopting real prep time action (AC-7)', () => {
    it('saves through partner update with ONLY usualPrepMinutes in the payload', async () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      const adoptButton = screen.getByRole('button', { name: 'Use 22 min as the usual prep time' })
      fireEvent.click(adoptButton)

      expect(mockUpdateTrigger).toHaveBeenCalledTimes(1)
      // AC-7: saves through the partner update with only usualPrepMinutes
      expect(mockUpdateTrigger).toHaveBeenCalledWith({
        id: 'p-1',
        data: { usualPrepMinutes: 22 },
      })
    })

    it('displays a success toast with partner name and new prep time after successful adopt', async () => {
      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      fireEvent.click(screen.getByRole('button', { name: 'Use 22 min as the usual prep time' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Taqueria Volos now uses 22 min as its usual prep time.',
        })
      })
    })

    it('displays a destructive toast when the partner update mutation fails', async () => {
      mockUpdateTrigger.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({ message: 'Database lock timeout' }),
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      fireEvent.click(screen.getByRole('button', { name: 'Use 22 min as the usual prep time' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Database lock timeout',
          variant: 'destructive',
        })
      })
    })

    it('displays fallback error message in destructive toast if error has no message', async () => {
      mockUpdateTrigger.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({}),
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      fireEvent.click(screen.getByRole('button', { name: 'Use 22 min as the usual prep time' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'The usual prep time could not be changed.',
          variant: 'destructive',
        })
      })
    })

    it('disables the adopt button while the update mutation is loading', () => {
      mockUseUpdatePartnerMutation.mockReturnValue([mockUpdateTrigger, { isLoading: true }])

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      const adoptButton = screen.getByRole('button', { name: 'Use 22 min as the usual prep time' })
      expect(adoptButton).toBeDisabled()
    })
  })

  describe('Error state (AC-7)', () => {
    it('shows "Could not load the record." when the query fails', () => {
      mockUseGetPartnerWaitRecordQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })

      render(<PartnerWaitRecordCard partnerId="p-1" partnerName="Taqueria Volos" />)

      expect(screen.getByText('Could not load the record.')).toBeInTheDocument()
    })
  })
})
