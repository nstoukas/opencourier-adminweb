import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ChangeHistoryCard,
  describeSettingValue,
  settingLabel,
  CHANGE_HISTORY_PAGE_SIZE,
} from './ChangeHistoryCard'
import type { SettingChangeAdminDto } from '@/backend-admin-sdk'

const mockUseGetSettingChangesQuery = jest.fn()
jest.mock('../../../api/reviewRequestApi', () => ({
  useGetSettingChangesQuery: (arg: any) => mockUseGetSettingChangesQuery(arg),
}))

describe('ChangeHistoryCard (spec 0038, AC-13)', () => {
  describe('describeSettingValue helper', () => {
    it('formats null, undefined, or empty string as "none"', () => {
      expect(describeSettingValue(null)).toBe('none')
      expect(describeSettingValue(undefined)).toBe('none')
      expect(describeSettingValue('')).toBe('none')
    })

    it('formats booleans as "on" and "off"', () => {
      expect(describeSettingValue(true)).toBe('on')
      expect(describeSettingValue(false)).toBe('off')
    })

    it('formats numbers and strings plainly', () => {
      expect(describeSettingValue(5000)).toBe('5000')
      expect(describeSettingValue('NEAREST_COURIER')).toBe('NEAREST_COURIER')
    })

    it('formats arrays as comma-separated values', () => {
      expect(describeSettingValue(['VEGAN', 'VEGETARIAN'])).toBe('VEGAN, VEGETARIAN')
      expect(describeSettingValue([true, false])).toBe('on, off')
    })

    it('formats nested objects as name: value pairs', () => {
      expect(describeSettingValue({ paid: true, label: 'Flat tire' })).toBe('paid: on, label: Flat tire')
    })
  })

  describe('settingLabel helper', () => {
    it('uses change.label when provided by backend', () => {
      expect(settingLabel({ key: 'waitPayFreeMinutes', label: 'Delay pay: free minutes' })).toBe(
        'Delay pay: free minutes'
      )
    })

    it('falls back to SETTINGS label map when change.label equals change.key', () => {
      expect(settingLabel({ key: 'quoteBaseFee', label: 'quoteBaseFee' })).toBe('Base fee')
      expect(settingLabel({ key: 'reviewAnswerDays', label: 'reviewAnswerDays' })).toBe(
        'Days to answer a review request'
      )
      expect(settingLabel({ key: 'unknownCustomKey', label: 'unknownCustomKey' })).toBe('unknownCustomKey')
    })
  })

  describe('ChangeHistoryCard component', () => {
    const sampleChanges: SettingChangeAdminDto[] = [
      {
        id: 'ch-1',
        key: 'reviewAnswerDays',
        label: 'Days to answer a review request',
        subject: null,
        oldValue: 14,
        newValue: 7,
        at: '2026-11-19T10:00:00Z',
        changedBy: 'admin@opencourier.gr',
      },
      {
        id: 'ch-2',
        key: 'removalReason',
        label: 'Removal reasons',
        subject: 'rr-puncture',
        oldValue: null,
        newValue: { name: 'Puncture', paid: true },
        at: '2026-11-19T09:30:00Z',
        changedBy: null, // Removed admin fallback
      },
      {
        id: 'ch-3',
        key: 'offerExpiryEnabled',
        label: 'Offer expiry',
        subject: null,
        oldValue: true,
        newValue: false,
        at: '2026-11-18T14:00:00Z',
        changedBy: 'representative@opencourier.gr',
      },
    ]

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('renders heading "Change history" and description with Athens recordedSince date', () => {
      mockUseGetSettingChangesQuery.mockReturnValue({
        data: {
          data: sampleChanges,
          recordedSince: '2026-11-01T00:00:00Z',
          pagination: { currentPage: 1, totalPages: 1, totalItems: 3 },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
      })

      render(<ChangeHistoryCard />)
      expect(screen.getByRole('heading', { name: 'Change history' })).toBeInTheDocument()
      expect(
        screen.getByText(/Recorded since .+ \(Athens time\)\. Riders see the changes that affect their work, without names\./i)
      ).toBeInTheDocument()
    })

    it('renders changes in a table with When, Setting, Before, After, and Saved by with admin login (AC-13)', () => {
      mockUseGetSettingChangesQuery.mockReturnValue({
        data: {
          data: sampleChanges,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 3 },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
      })

      render(<ChangeHistoryCard />)

      // Columns
      expect(screen.getByRole('columnheader', { name: 'When' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Setting' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Before' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'After' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Saved by' })).toBeInTheDocument()

      // Row 1: reviewAnswerDays
      expect(screen.getByText('Days to answer a review request')).toBeInTheDocument()
      expect(screen.getByText('14')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('admin@opencourier.gr')).toBeInTheDocument()

      // Row 2: removalReason with null oldValue ('none') and removed admin
      expect(screen.getByText('none')).toBeInTheDocument()
      expect(screen.getByText('name: Puncture, paid: on')).toBeInTheDocument()
      expect(screen.getByText('a removed admin')).toBeInTheDocument()

      // Row 3: offerExpiryEnabled boolean values
      expect(screen.getByText('on')).toBeInTheDocument()
      expect(screen.getByText('off')).toBeInTheDocument()
      expect(screen.getByText('representative@opencourier.gr')).toBeInTheDocument()
    })

    it('renders honest empty state when no changes exist', () => {
      mockUseGetSettingChangesQuery.mockReturnValue({
        data: {
          data: [],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
      })

      render(<ChangeHistoryCard />)
      expect(screen.getByText('No change recorded yet.')).toBeInTheDocument()
    })

    it('renders error message when query fails', () => {
      mockUseGetSettingChangesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
      })

      render(<ChangeHistoryCard />)
      expect(
        screen.getByText('The change history could not be loaded. Try again in a moment.')
      ).toBeInTheDocument()
    })

    it('supports Newer and Older pagination controls when multiple pages exist', () => {
      mockUseGetSettingChangesQuery.mockReturnValue({
        data: {
          data: sampleChanges,
          pagination: { currentPage: 1, totalPages: 2, totalItems: 25, nextPage: 2, prevPage: null },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
      })

      render(<ChangeHistoryCard />)

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      const newerBtn = screen.getByRole('button', { name: 'Newer' })
      const olderBtn = screen.getByRole('button', { name: 'Older' })

      expect(newerBtn).toBeDisabled()
      expect(olderBtn).not.toBeDisabled()

      fireEvent.click(olderBtn)

      expect(mockUseGetSettingChangesQuery).toHaveBeenCalledWith({
        page: 2,
        perPage: CHANGE_HISTORY_PAGE_SIZE,
      })
      expect(CHANGE_HISTORY_PAGE_SIZE).toBe(20)
    })
  })
})
