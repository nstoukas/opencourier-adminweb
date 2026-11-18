import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PartnerApiKeyCard, formatKeyMade, NO_LOGIN_NO_KEY } from './PartnerApiKeyCard'
import { useCreatePartnerApiKeyMutation, useRemovePartnerApiKeyMutation } from '../../../api/partnersApi'
import type { PartnerAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/partnersApi', () => ({
  useCreatePartnerApiKeyMutation: jest.fn(),
  useRemovePartnerApiKeyMutation: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockCreateApiKey = jest.fn()
const mockCreateReset = jest.fn()
const mockRemoveApiKey = jest.fn()
const mockUseCreatePartnerApiKeyMutation = useCreatePartnerApiKeyMutation as jest.Mock
const mockUseRemovePartnerApiKeyMutation = useRemovePartnerApiKeyMutation as jest.Mock

describe('PartnerApiKeyCard (spec 0037, AC-5, AC-13)', () => {
  const basePartner: PartnerAdminDto = {
    id: 'partner-volos-1',
    name: 'Nosh Volos',
    phoneNumber: '+302421012345',
    logo: null,
    webhookUrl: null,
    usualPrepMinutes: 15,
    userId: 'user-volos-1',
    email: 'nosh@volos.gr',
    apiKeyCreatedAt: null,
    pickupAddress: null,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-01T10:00:00.000Z'),
    availability: undefined,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreatePartnerApiKeyMutation.mockReturnValue([
      mockCreateApiKey,
      { isLoading: false, reset: mockCreateReset },
    ])
    mockUseRemovePartnerApiKeyMutation.mockReturnValue([
      mockRemoveApiKey,
      { isLoading: false },
    ])
  })

  describe('formatKeyMade (Athens timezone formatting)', () => {
    it('formats UTC instant into Europe/Athens time where Athens hour differs from UTC', () => {
      // Winter time in Greece: UTC+2. 20:15 UTC is 22:15 Athens.
      const winterUtc = new Date('2026-11-18T20:15:00.000Z')
      expect(formatKeyMade(winterUtc)).toBe('Key made 18 Nov 2026, 22:15')

      // Summer time (EEST) in Greece: UTC+3. 11:00 UTC is 14:00 Athens.
      const summerUtc = new Date('2026-06-10T11:00:00.000Z')
      expect(formatKeyMade(summerUtc)).toBe('Key made 10 Jun 2026, 14:00')
    })
  })

  describe('Card states and texts (AC-5, AC-13, Decision 110.4)', () => {
    it('shows "No login, so no API key." with both buttons disabled and aria-describedby pointing to it when userId is null', () => {
      const partnerWithoutLogin: PartnerAdminDto = {
        ...basePartner,
        userId: null,
        apiKeyCreatedAt: null,
      }

      render(<PartnerApiKeyCard partner={partnerWithoutLogin} />)

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent(NO_LOGIN_NO_KEY)
      expect(stateElem).toHaveTextContent('No login, so no API key.')

      const reasonId = stateElem.getAttribute('id')
      expect(reasonId).toBeTruthy()

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      expect(newKeyBtn).toBeDisabled()
      expect(newKeyBtn).toHaveAttribute('aria-describedby', reasonId)

      expect(removeKeyBtn).toBeDisabled()
      expect(removeKeyBtn).toHaveAttribute('aria-describedby', reasonId)
    })

    it('shows "No API key." when partner has a login but no key; Remove key is disabled and New key is enabled', () => {
      const partnerNoKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
      }

      render(<PartnerApiKeyCard partner={partnerNoKey} />)

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent('No API key.')

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      expect(newKeyBtn).toBeEnabled()
      expect(newKeyBtn).not.toHaveAttribute('aria-describedby')

      expect(removeKeyBtn).toBeDisabled()
      expect(removeKeyBtn).not.toHaveAttribute('aria-describedby')
    })

    it('shows "Key made <Athens time>" when partner has an API key; both buttons are enabled', () => {
      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T20:15:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent('Key made 18 Nov 2026, 22:15')

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      expect(newKeyBtn).toBeEnabled()
      expect(removeKeyBtn).toBeEnabled()
    })
  })

  describe('New API key flow (AC-13)', () => {
    it('without an existing key: makes one straight away without asking confirmation; shows key panel', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            apiKey: 'ock_fresh_api_key_001',
            apiKeyCreatedAt: new Date('2026-11-18T20:00:00.000Z'),
          }),
      })

      const partnerNoKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
      }

      render(<PartnerApiKeyCard partner={partnerNoKey} />)

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      fireEvent.click(newKeyBtn)

      // Immediately called mutation without any intermediate confirmation dialog
      expect(mockCreateApiKey).toHaveBeenCalledTimes(1)
      expect(mockCreateApiKey).toHaveBeenCalledWith({ id: 'partner-volos-1' })

      await waitFor(() => {
        expect(mockCreateReset).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()
      })

      expect(screen.getByText('For Nosh Volos.')).toBeInTheDocument()
      const keyInput = screen.getByRole('textbox', { name: 'New API key' }) as HTMLInputElement
      expect(keyInput.value).toBe('ock_fresh_api_key_001')

      // Escape does not close the key panel
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' })
      expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()

      // Done button closes the panel
      const doneBtn = screen.getByRole('button', { name: 'Done' })
      fireEvent.click(doneBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'New API key' })).toBeNull()
      })
    })

    it('with an existing key: asks "Replace the API key?" first, only makes key on confirm', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            apiKey: 'ock_replaced_api_key_002',
            apiKeyCreatedAt: new Date('2026-11-18T20:00:00.000Z'),
          }),
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      fireEvent.click(newKeyBtn)

      // Did NOT call mutation yet
      expect(mockCreateApiKey).not.toHaveBeenCalled()

      // Confirmation dialog is shown
      expect(screen.getByRole('heading', { name: 'Replace the API key?' })).toBeInTheDocument()
      expect(
        screen.getByText(
          'The current key of Nosh Volos stops working at once. Whatever uses it must be given the new key.'
        )
      ).toBeInTheDocument()

      // Confirming makes the key
      const confirmBtn = screen.getByRole('button', { name: 'Make a new key' })
      fireEvent.click(confirmBtn)

      expect(mockCreateApiKey).toHaveBeenCalledTimes(1)
      expect(mockCreateApiKey).toHaveBeenCalledWith({ id: 'partner-volos-1' })

      await waitFor(() => {
        expect(mockCreateReset).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()
      })

      const keyInput = screen.getByRole('textbox', { name: 'New API key' }) as HTMLInputElement
      expect(keyInput.value).toBe('ock_replaced_api_key_002')

      // Done closes the panel
      fireEvent.click(screen.getByRole('button', { name: 'Done' }))
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'New API key' })).toBeNull()
      })
    })

    it('with an existing key: Cancel or Escape closes the confirmation dialog without making a key', async () => {
      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^new api key$/i }))
      expect(screen.getByRole('heading', { name: 'Replace the API key?' })).toBeInTheDocument()

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Replace the API key?' })).toBeNull()
      })
      expect(mockCreateApiKey).not.toHaveBeenCalled()
    })
  })

  describe('Remove key flow (AC-4, AC-13)', () => {
    it('asks "Remove the API key?" confirmation, confirms and calls remove mutation', async () => {
      mockRemoveApiKey.mockReturnValue({
        unwrap: () => Promise.resolve(null),
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      const removeBtn = screen.getByRole('button', { name: /^remove key$/i })
      fireEvent.click(removeBtn)

      expect(mockRemoveApiKey).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Remove the API key?' })).toBeInTheDocument()
      expect(
        screen.getByText('The key of Nosh Volos stops working at once, and no new one is made.')
      ).toBeInTheDocument()

      // Confirm removal
      const confirmRemoveBtn = screen.getByRole('button', { name: 'Remove key' })
      fireEvent.click(confirmRemoveBtn)

      expect(mockRemoveApiKey).toHaveBeenCalledTimes(1)
      expect(mockRemoveApiKey).toHaveBeenCalledWith({ id: 'partner-volos-1' })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: 'The API key of Nosh Volos is removed.' })
        expect(screen.queryByRole('heading', { name: 'Remove the API key?' })).toBeNull()
      })
    })

    it('Cancel closes remove confirmation dialog without calling mutation', async () => {
      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^remove key$/i }))
      expect(screen.getByRole('heading', { name: 'Remove the API key?' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Remove the API key?' })).toBeNull()
      })
      expect(mockRemoveApiKey).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('shows destructive toast when direct makeKey fails without open dialog', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () => Promise.reject({ message: 'Server error creating key' }),
      })

      const partnerNoKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
      }

      render(<PartnerApiKeyCard partner={partnerNoKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^new api key$/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Server error creating key',
          variant: 'destructive',
        })
      })
    })

    it('displays error message in dialog when removeApiKey fails', async () => {
      mockRemoveApiKey.mockReturnValue({
        unwrap: () => Promise.reject({ message: 'Failed to delete key from database' }),
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^remove key$/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to delete key from database')).toBeInTheDocument()
      })
      expect(mockToast).not.toHaveBeenCalled()
    })
  })
})
