import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PartnerAvailabilityCard } from './PartnerAvailabilityCard'
import {
  useDisablePartnerMutation,
  useEnablePartnerMutation,
  useGetPartnerAvailabilityChangesQuery,
} from '../../../api/partnersApi'
import type { PartnerAdminDto, PartnerAvailabilityChangeAdminDto } from '../../../backend-admin-sdk'
import { formatDate } from '../../../ui-shared-utils'

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../../api/partnersApi', () => ({
  useDisablePartnerMutation: jest.fn(),
  useEnablePartnerMutation: jest.fn(),
  useGetPartnerAvailabilityChangesQuery: jest.fn(),
}))

const mockUseDisablePartnerMutation = useDisablePartnerMutation as jest.Mock
const mockUseEnablePartnerMutation = useEnablePartnerMutation as jest.Mock
const mockUseGetPartnerAvailabilityChangesQuery = useGetPartnerAvailabilityChangesQuery as jest.Mock

describe('PartnerAvailabilityCard (spec 0029, AC-9)', () => {
  let mockDisableTrigger: jest.Mock
  let mockEnableTrigger: jest.Mock

  const samplePartner: PartnerAdminDto = {
    id: 'partner-123',
    name: 'Souvlaki Bar',
    phoneNumber: '+302421012345',
    logo: null,
    webhookUrl: null,
    usualPrepMinutes: 15,
    userId: 'u1',
    email: 'souvlaki@bar.gr',
    pickupAddress: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    availability: {
      busyExtraMinutes: null,
      pausedUntil: null,
      disabledAt: null,
      disabledReason: null,
      acceptingOrders: true,
      notAcceptingReason: null,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDisableTrigger = jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) })
    mockEnableTrigger = jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) })

    mockUseDisablePartnerMutation.mockReturnValue([mockDisableTrigger, { isLoading: false }])
    mockUseEnablePartnerMutation.mockReturnValue([mockEnableTrigger, { isLoading: false }])
    mockUseGetPartnerAvailabilityChangesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
  })

  describe('Availability state display', () => {
    it('shows "Accepting orders." when acceptingOrders is true and busy mode is off', () => {
      render(<PartnerAvailabilityCard partner={samplePartner} />)

      expect(screen.getByRole('heading', { level: 3, name: 'Availability' })).toBeInTheDocument()
      const state = screen.getByTestId('availability-state')
      expect(state).toHaveTextContent('Accepting orders.')
      expect(screen.queryByText(/Busy mode:/)).toBeNull()
    })

    it('shows "Accepting orders." fallback when availability object is undefined', () => {
      const partnerNoAvail = { ...samplePartner, availability: undefined }
      render(<PartnerAvailabilityCard partner={partnerNoAvail} />)

      expect(screen.getByTestId('availability-state')).toHaveTextContent('Accepting orders.')
    })

    it('shows the server refusal reason when acceptingOrders is false (e.g. disabled)', () => {
      const disabledPartner: PartnerAdminDto = {
        ...samplePartner,
        availability: {
          busyExtraMinutes: null,
          pausedUntil: null,
          disabledAt: new Date('2026-11-09T10:00:00.000Z'),
          disabledReason: 'Health inspection pending',
          acceptingOrders: false,
          notAcceptingReason: 'The co-op has disabled this restaurant: Health inspection pending',
        },
      }

      render(<PartnerAvailabilityCard partner={disabledPartner} />)

      const state = screen.getByTestId('availability-state')
      expect(state).toHaveTextContent('The co-op has disabled this restaurant: Health inspection pending')
    })

    it('shows the pause refusal sentence when acceptingOrders is false due to a pause', () => {
      const pausedPartner: PartnerAdminDto = {
        ...samplePartner,
        availability: {
          busyExtraMinutes: null,
          pausedUntil: new Date('2026-11-09T14:30:00.000Z'),
          disabledAt: null,
          disabledReason: null,
          acceptingOrders: false,
          notAcceptingReason: 'Ordering is paused until 14:30.',
        },
      }

      render(<PartnerAvailabilityCard partner={pausedPartner} />)

      const state = screen.getByTestId('availability-state')
      expect(state).toHaveTextContent('Ordering is paused until 14:30.')
    })

    it('shows busy mode line when busyExtraMinutes is active', () => {
      const busyPartner: PartnerAdminDto = {
        ...samplePartner,
        availability: {
          busyExtraMinutes: 15,
          pausedUntil: null,
          disabledAt: null,
          disabledReason: null,
          acceptingOrders: true,
          notAcceptingReason: null,
        },
      }

      render(<PartnerAvailabilityCard partner={busyPartner} />)

      expect(screen.getByText('Busy mode: +15 min on new orders.')).toBeInTheDocument()
    })
  })

  describe('Disable action and dialog', () => {
    it('shows "Disable" button when partner is enabled, and opens dialog with textarea', () => {
      render(<PartnerAvailabilityCard partner={samplePartner} />)

      const disableBtn = screen.getByRole('button', { name: 'Disable' })
      expect(disableBtn).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enable' })).toBeNull()

      fireEvent.click(disableBtn)

      expect(screen.getByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeInTheDocument()
      expect(
        screen.getByText('It keeps its sign in but cannot place orders. The restaurant reads your reason.')
      ).toBeInTheDocument()
      const textarea = screen.getByLabelText('Reason')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('maxLength', '200')
    })

    it('refuses empty or whitespace-only reason with an error message and does not call the mutation', async () => {
      render(<PartnerAvailabilityCard partner={samplePartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

      const dialog = screen.getByRole('dialog')
      const submitBtn = within(dialog).getByRole('button', { name: 'Disable' })
      fireEvent.click(submitBtn)

      expect(screen.getByRole('alert')).toHaveTextContent('Give a reason, up to 200 characters.')
      expect(mockDisableTrigger).not.toHaveBeenCalled()

      // Fill only whitespace
      fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: '    ' } })
      fireEvent.click(submitBtn)

      expect(screen.getByRole('alert')).toHaveTextContent('Give a reason, up to 200 characters.')
      expect(mockDisableTrigger).not.toHaveBeenCalled()
    })

    it('submits valid trimmed reason, toasts success and closes dialog', async () => {
      mockDisableTrigger.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'partner-123' }),
      })

      render(<PartnerAvailabilityCard partner={samplePartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

      const dialog = screen.getByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Reason'), {
        target: { value: '  Overdue fee payments  ' },
      })

      const dialogDisableBtn = within(dialog).getByRole('button', { name: 'Disable' })
      fireEvent.click(dialogDisableBtn)

      await waitFor(() => {
        expect(mockDisableTrigger).toHaveBeenCalledTimes(1)
        expect(mockDisableTrigger).toHaveBeenCalledWith({
          id: 'partner-123',
          reason: 'Overdue fee payments',
        })
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Souvlaki Bar is disabled.',
        })
      })

      // Dialog is closed
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeNull()
      })
    })

    it('displays error in dialog when disable mutation fails', async () => {
      mockDisableTrigger.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Server failed to disable restaurant')),
      })

      render(<PartnerAvailabilityCard partner={samplePartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
      const dialog = screen.getByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Seasonal closure' } })

      const dialogDisableBtn = within(dialog).getByRole('button', { name: 'Disable' })
      fireEvent.click(dialogDisableBtn)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Server failed to disable restaurant')
      })
      // Dialog remains open
      expect(screen.getByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeInTheDocument()
    })

    it('disables dialog Disable button while mutation is loading', () => {
      mockUseDisablePartnerMutation.mockReturnValue([mockDisableTrigger, { isLoading: true }])

      render(<PartnerAvailabilityCard partner={samplePartner} />)
      fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

      const dialog = screen.getByRole('dialog')
      const dialogDisableBtn = within(dialog).getByRole('button', { name: 'Disable' })
      expect(dialogDisableBtn).toBeDisabled()
    })

    it('closes dialog on Cancel click without calling mutation', () => {
      render(<PartnerAvailabilityCard partner={samplePartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
      expect(screen.getByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeNull()
      expect(mockDisableTrigger).not.toHaveBeenCalled()
    })

    it('returns focus to the Disable button after dialog closes (onCloseAutoFocus)', async () => {
      render(<PartnerAvailabilityCard partner={samplePartner} />)

      const mainDisableBtn = screen.getByRole('button', { name: 'Disable' })
      fireEvent.click(mainDisableBtn)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Disable Souvlaki Bar' })).toBeNull()
        expect(document.activeElement).toBe(mainDisableBtn)
      })
    })
  })

  describe('Enable action', () => {
    const disabledPartner: PartnerAdminDto = {
      ...samplePartner,
      availability: {
        busyExtraMinutes: null,
        pausedUntil: null,
        disabledAt: new Date('2026-11-09T10:00:00.000Z'),
        disabledReason: 'Health inspection pending',
        acceptingOrders: false,
        notAcceptingReason: 'The co-op has disabled this restaurant: Health inspection pending',
      },
    }

    it('shows "Enable" button (and no "Disable" button) when partner is disabled', () => {
      render(<PartnerAvailabilityCard partner={disabledPartner} />)

      expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Disable' })).toBeNull()
    })

    it('calls enablePartner mutation and toasts success on click', async () => {
      mockEnableTrigger.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'partner-123' }),
      })

      render(<PartnerAvailabilityCard partner={disabledPartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

      await waitFor(() => {
        expect(mockEnableTrigger).toHaveBeenCalledTimes(1)
        expect(mockEnableTrigger).toHaveBeenCalledWith({ id: 'partner-123' })
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Souvlaki Bar is enabled.',
        })
      })
    })

    it('toasts error with destructive variant when enable mutation fails', async () => {
      mockEnableTrigger.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Enable failed')),
      })

      render(<PartnerAvailabilityCard partner={disabledPartner} />)

      fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Enable failed',
          variant: 'destructive',
        })
      })
    })

    it('disables Enable button while mutation is in progress', () => {
      mockUseEnablePartnerMutation.mockReturnValue([mockEnableTrigger, { isLoading: true }])

      render(<PartnerAvailabilityCard partner={disabledPartner} />)

      expect(screen.getByRole('button', { name: 'Enable' })).toBeDisabled()
    })
  })

  describe('Availability history list (AC-9: last 50 changes)', () => {
    it('shows "No changes yet." when history list is empty', () => {
      mockUseGetPartnerAvailabilityChangesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      })

      render(<PartnerAvailabilityCard partner={samplePartner} />)

      expect(screen.getByText('History')).toBeInTheDocument()
      expect(screen.getByText('No changes yet.')).toBeInTheDocument()
    })

    it('shows "Could not load the history." when query fails', () => {
      mockUseGetPartnerAvailabilityChangesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      })

      render(<PartnerAvailabilityCard partner={samplePartner} />)

      const errText = screen.getByText('Could not load the history.')
      expect(errText).toBeInTheDocument()
      expect(errText).toHaveClass('text-destructive')
    })

    it('renders all 6 change action types with formatted date, action words, and actor', () => {
      const now = new Date('2026-11-09T12:00:00.000Z')
      const pauseEnd = new Date('2026-11-09T14:30:00.000Z')

      const changes: PartnerAvailabilityChangeAdminDto[] = [
        {
          id: 'ch-1',
          action: 'BUSY_ON',
          actorRole: 'PARTNER',
          actorEmail: 'chef@souvlaki.gr',
          extraMinutes: 20,
          pausedUntil: null,
          reason: null,
          createdAt: now,
        },
        {
          id: 'ch-2',
          action: 'BUSY_OFF',
          actorRole: 'PARTNER',
          actorEmail: 'chef@souvlaki.gr',
          extraMinutes: null,
          pausedUntil: null,
          reason: null,
          createdAt: now,
        },
        {
          id: 'ch-3',
          action: 'PAUSED',
          actorRole: 'PARTNER',
          actorEmail: 'cashier@souvlaki.gr',
          extraMinutes: null,
          pausedUntil: pauseEnd,
          reason: null,
          createdAt: now,
        },
        {
          id: 'ch-4',
          action: 'RESUMED',
          actorRole: 'PARTNER',
          actorEmail: 'cashier@souvlaki.gr',
          extraMinutes: null,
          pausedUntil: null,
          reason: null,
          createdAt: now,
        },
        {
          id: 'ch-5',
          action: 'DISABLED',
          actorRole: 'ADMIN',
          actorEmail: 'admin@opencourier.org',
          extraMinutes: null,
          pausedUntil: null,
          reason: 'Non-payment of dues',
          createdAt: now,
        },
        {
          id: 'ch-6',
          action: 'ENABLED',
          actorRole: 'ADMIN',
          actorEmail: null, // Tests fallback to actorRole
          extraMinutes: null,
          pausedUntil: null,
          reason: null,
          createdAt: now,
        },
      ]

      mockUseGetPartnerAvailabilityChangesQuery.mockReturnValue({
        data: changes,
        isLoading: false,
        isError: false,
      })

      render(<PartnerAvailabilityCard partner={samplePartner} />)

      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(6)

      const expectedDate = formatDate(now)
      const expectedPauseDate = formatDate(pauseEnd)

      // BUSY_ON
      expect(items[0]).toHaveTextContent(`${expectedDate} Busy mode on, +20 min (chef@souvlaki.gr)`)
      // BUSY_OFF
      expect(items[1]).toHaveTextContent(`${expectedDate} Busy mode off (chef@souvlaki.gr)`)
      // PAUSED
      expect(items[2]).toHaveTextContent(`${expectedDate} Paused until ${expectedPauseDate} (cashier@souvlaki.gr)`)
      // RESUMED
      expect(items[3]).toHaveTextContent(`${expectedDate} Resumed (cashier@souvlaki.gr)`)
      // DISABLED
      expect(items[4]).toHaveTextContent(`${expectedDate} Disabled: Non-payment of dues (admin@opencourier.org)`)
      // ENABLED (with actorRole fallback when actorEmail is null)
      expect(items[5]).toHaveTextContent(`${expectedDate} Enabled (ADMIN)`)
    })
  })
})
