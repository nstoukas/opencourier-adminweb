import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import {
  PartnerApiKeyCard,
  formatKeyMade as rawFormatKeyMade,
  keyStateText,
  NO_LOGIN_NO_KEY,
} from './PartnerApiKeyCard'
import { createI18n } from '@/i18n/createI18n'
import { formatDateTime } from '@/i18n/format'
import type { Formats } from '@/i18n/useFormat'

const t = createI18n('en').t
const f = {
  dateTime: (date: Date) => formatDateTime(date, 'en'),
} as Formats
const formatKeyMade = (date: Date) => rawFormatKeyMade(date, t, f)

const tEl = createI18n('el').t
const fEl = {
  dateTime: (date: Date) => formatDateTime(date, 'el'),
} as Formats

function renderInLanguage(ui: React.ReactElement, language: 'en' | 'el') {
  const i18n = createI18n(language)
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}
import {
  partnersApi,
  useCreatePartnerApiKeyMutation,
  useRemovePartnerApiKeyMutation,
} from '../../../api/partnersApi'
import { authSlice } from '@/modules/auth/slices/authSlice'
import type { PartnerAdminDto } from '../../../backend-admin-sdk'

const actualPartnersApi = jest.requireActual('../../../api/partnersApi')

jest.mock('../../../api/partnersApi', () => {
  const actual = jest.requireActual('../../../api/partnersApi')
  return {
    ...actual,
    useCreatePartnerApiKeyMutation: jest.fn(),
    useRemovePartnerApiKeyMutation: jest.fn(),
  }
})

const mockPrepareAdminSdk = jest.fn()
jest.mock('../../../api', () => {
  const actual = jest.requireActual('../../../api')
  return {
    ...actual,
    prepareAdminSdk: (...args: any[]) => mockPrepareAdminSdk(...args),
  }
})

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockCreateApiKey = jest.fn()
let mockCreateRequestReset = jest.fn()
const mockRemoveApiKey = jest.fn()
const mockUseCreatePartnerApiKeyMutation = useCreatePartnerApiKeyMutation as jest.Mock
const mockUseRemovePartnerApiKeyMutation = useRemovePartnerApiKeyMutation as jest.Mock

function setupTestStore() {
  return configureStore({
    reducer: {
      [partnersApi.reducerPath]: partnersApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(partnersApi.middleware),
    preloadedState: { auth: { accessToken: 'admin-token' } },
  })
}

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
    mockCreateRequestReset = jest.fn()
    mockCreateApiKey.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          apiKey: 'ock_fresh_api_key_001',
          apiKeyCreatedAt: new Date('2026-11-18T20:00:00.000Z'),
        }),
      reset: mockCreateRequestReset,
    })
    mockUseCreatePartnerApiKeyMutation.mockReturnValue([
      mockCreateApiKey,
      { isLoading: false },
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
      expect(formatKeyMade(winterUtc)).toBe('Key made 18/11/2026, 22:15')

      // Summer time (EEST) in Greece: UTC+3. 11:00 UTC is 14:00 Athens.
      const summerUtc = new Date('2026-06-10T11:00:00.000Z')
      expect(formatKeyMade(summerUtc)).toBe('Key made 10/06/2026, 14:00')
    })
  })

  // Row 162: keyStateText helper decides the first sentence
  describe('keyStateText (row 162 helper)', () => {
    const partnerBase: PartnerAdminDto = {
      ...basePartner,
      userId: 'user-123',
      apiKeyCreatedAt: null,
      apiKeyRemovedByResetAt: null,
    }

    it('returns partners.apiKey.removedByReset with date on Athens time in English and Greek when apiKeyCreatedAt is null and apiKeyRemovedByResetAt is set (Clause 1)', () => {
      // Winter time (UTC+2): 12:05 UTC is 14:05 Athens
      const winterPartner: PartnerAdminDto = {
        ...partnerBase,
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }
      expect(keyStateText(winterPartner, t, f)).toBe(
        "No API key. The restaurant's own password reset removed it on 25/11/2026, 14:05."
      )
      expect(keyStateText(winterPartner, tEl, fEl)).toBe(
        'Χωρίς κλειδί API. Αφαιρέθηκε με την επαναφορά κωδικού του ίδιου του καταστήματος, 25/11/2026, 14:05.'
      )

      // Summer time (EEST / UTC+3): 11:00 UTC is 14:00 Athens
      const summerPartner: PartnerAdminDto = {
        ...partnerBase,
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-06-10T11:00:00.000Z'),
      }
      expect(keyStateText(summerPartner, t, f)).toBe(
        "No API key. The restaurant's own password reset removed it on 10/06/2026, 14:00."
      )
      expect(keyStateText(summerPartner, tEl, fEl)).toBe(
        'Χωρίς κλειδί API. Αφαιρέθηκε με την επαναφορά κωδικού του ίδιου του καταστήματος, 10/06/2026, 14:00.'
      )
    })

    it('returns keyMade when apiKeyCreatedAt is set, even if apiKeyRemovedByResetAt is also set (Clause 2)', () => {
      const partnerWithBoth: PartnerAdminDto = {
        ...partnerBase,
        apiKeyCreatedAt: new Date('2026-11-18T20:15:00.000Z'),
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }
      expect(keyStateText(partnerWithBoth, t, f)).toBe('Key made 18/11/2026, 22:15')
      expect(keyStateText(partnerWithBoth, tEl, fEl)).toBe('Το κλειδί δημιουργήθηκε: 18/11/2026, 22:15')
    })

    it('returns partners.apiKey.none when neither apiKeyCreatedAt nor apiKeyRemovedByResetAt is set (Clause 2)', () => {
      const partnerWithNeither: PartnerAdminDto = {
        ...partnerBase,
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: null,
      }
      expect(keyStateText(partnerWithNeither, t, f)).toBe('No API key.')
      expect(keyStateText(partnerWithNeither, tEl, fEl)).toBe('Χωρίς κλειδί API.')
    })

    it('returns NO_LOGIN_NO_KEY when partner has no userId, even if apiKeyRemovedByResetAt is set (Clause 2)', () => {
      const partnerNoLogin: PartnerAdminDto = {
        ...partnerBase,
        userId: null,
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }
      expect(keyStateText(partnerNoLogin, t, f)).toBe('No login, so no API key.')
      expect(keyStateText(partnerNoLogin, tEl, fEl)).toBe('Χωρίς σύνδεση, άρα χωρίς κλειδί API.')
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
      expect(stateElem).toHaveTextContent(t(NO_LOGIN_NO_KEY))
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
      const reasonId = stateElem.getAttribute('id')
      expect(reasonId).toBeTruthy()

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      expect(newKeyBtn).toBeEnabled()
      expect(newKeyBtn).not.toHaveAttribute('aria-describedby')

      expect(removeKeyBtn).toBeDisabled()
      expect(removeKeyBtn).toHaveAttribute('aria-describedby', reasonId)
    })

    it('shows "Key made <Athens time>" when partner has an API key; both buttons are enabled', () => {
      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T20:15:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent('Key made 18/11/2026, 22:15')

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      expect(newKeyBtn).toBeEnabled()
      expect(removeKeyBtn).toBeEnabled()
    })

    // Row 162 (Clause 1): After a restaurant's own reset removes its key, the card says so with the date in English
    it('shows partners.apiKey.removedByReset with Athens date in English when apiKeyCreatedAt is null and apiKeyRemovedByResetAt is set (Clause 1)', () => {
      // Winter time: 12:05 UTC is 14:05 Athens time
      const partnerReset: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }

      renderInLanguage(<PartnerApiKeyCard partner={partnerReset} />, 'en')

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent(
        "No API key. The restaurant's own password reset removed it on 25/11/2026, 14:05."
      )
      const reasonId = stateElem.getAttribute('id')
      expect(reasonId).toBeTruthy()

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^remove key$/i })

      // New key is enabled (admin can generate a replacement key)
      expect(newKeyBtn).toBeEnabled()
      expect(newKeyBtn).not.toHaveAttribute('aria-describedby')

      // Remove key is disabled (no key to remove) and points to state element
      expect(removeKeyBtn).toBeDisabled()
      expect(removeKeyBtn).toHaveAttribute('aria-describedby', reasonId)
    })

    // Row 162 (Clause 1): After a restaurant's own reset removes its key, the card says so with the date in Greek
    it('shows partners.apiKey.removedByReset with Athens date in Greek when apiKeyCreatedAt is null and apiKeyRemovedByResetAt is set (Clause 1)', () => {
      const partnerReset: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }

      renderInLanguage(<PartnerApiKeyCard partner={partnerReset} />, 'el')

      const stateElem = screen.getByTestId('api-key-state')
      expect(stateElem).toHaveTextContent(
        'Χωρίς κλειδί API. Αφαιρέθηκε με την επαναφορά κωδικού του ίδιου του καταστήματος, 25/11/2026, 14:05.'
      )
      const reasonId = stateElem.getAttribute('id')
      expect(reasonId).toBeTruthy()

      const newKeyBtn = screen.getByRole('button', { name: /^νέο κλειδί api$/i })
      const removeKeyBtn = screen.getByRole('button', { name: /^αφαίρεση κλειδιού$/i })

      expect(newKeyBtn).toBeEnabled()
      expect(newKeyBtn).not.toHaveAttribute('aria-describedby')

      expect(removeKeyBtn).toBeDisabled()
      expect(removeKeyBtn).toHaveAttribute('aria-describedby', reasonId)
    })

    // Row 162 (Clause 2): With a key (apiKeyCreatedAt set), shows key date even if apiKeyRemovedByResetAt is set
    it('shows key date and not reset note when apiKeyCreatedAt is set even if apiKeyRemovedByResetAt is set (Clause 2)', () => {
      const partnerWithBoth: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T20:15:00.000Z'),
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }

      // English render
      const { unmount } = renderInLanguage(<PartnerApiKeyCard partner={partnerWithBoth} />, 'en')
      const stateElemEn = screen.getByTestId('api-key-state')
      expect(stateElemEn).toHaveTextContent('Key made 18/11/2026, 22:15')
      expect(stateElemEn.textContent).not.toContain('reset')
      expect(stateElemEn.textContent).not.toContain('removed')
      expect(screen.getByRole('button', { name: /^new api key$/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /^remove key$/i })).toBeEnabled()
      unmount()

      // Greek render
      renderInLanguage(<PartnerApiKeyCard partner={partnerWithBoth} />, 'el')
      const stateElemEl = screen.getByTestId('api-key-state')
      expect(stateElemEl).toHaveTextContent('Το κλειδί δημιουργήθηκε: 18/11/2026, 22:15')
      expect(stateElemEl.textContent).not.toContain('επαναφορά')
      expect(stateElemEl.textContent).not.toContain('Αφαιρέθηκε')
      expect(screen.getByRole('button', { name: /^νέο κλειδί api$/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /^αφαίρεση κλειδιού$/i })).toBeEnabled()
    })

    // Row 162 (Clause 2): With neither, shows plain partners.apiKey.none in both languages
    it('shows plain partners.apiKey.none in English and Greek when neither key nor reset note exists (Clause 2)', () => {
      const partnerNeither: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: null,
      }

      const { unmount } = renderInLanguage(<PartnerApiKeyCard partner={partnerNeither} />, 'en')
      expect(screen.getByTestId('api-key-state')).toHaveTextContent('No API key.')
      expect(screen.getByRole('button', { name: /^new api key$/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /^remove key$/i })).toBeDisabled()
      unmount()

      renderInLanguage(<PartnerApiKeyCard partner={partnerNeither} />, 'el')
      expect(screen.getByTestId('api-key-state')).toHaveTextContent('Χωρίς κλειδί API.')
      expect(screen.getByRole('button', { name: /^νέο κλειδί api$/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /^αφαίρεση κλειδιού$/i })).toBeDisabled()
    })

    // Row 162 (Clause 2): With no login, shows no login sentence even if apiKeyRemovedByResetAt were set
    it('shows no login sentence in English and Greek when userId is null even if apiKeyRemovedByResetAt is set (Clause 2)', () => {
      const partnerNoLoginWithReset: PartnerAdminDto = {
        ...basePartner,
        userId: null,
        apiKeyCreatedAt: null,
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
      }

      const { unmount } = renderInLanguage(<PartnerApiKeyCard partner={partnerNoLoginWithReset} />, 'en')
      const stateElemEn = screen.getByTestId('api-key-state')
      expect(stateElemEn).toHaveTextContent('No login, so no API key.')
      expect(screen.getByRole('button', { name: /^new api key$/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /^remove key$/i })).toBeDisabled()
      unmount()

      renderInLanguage(<PartnerApiKeyCard partner={partnerNoLoginWithReset} />, 'el')
      const stateElemEl = screen.getByTestId('api-key-state')
      expect(stateElemEl).toHaveTextContent('Χωρίς σύνδεση, άρα χωρίς κλειδί API.')
      expect(screen.getByRole('button', { name: /^νέο κλειδί api$/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /^αφαίρεση κλειδιού$/i })).toBeDisabled()
    })
  })

  describe('New API key flow (AC-13)', () => {
    it('without an existing key: makes one straight away; hides Close, autoFocuses key, calls request.reset(), and only Done closes', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            apiKey: 'ock_fresh_api_key_001',
            apiKeyCreatedAt: new Date('2026-11-18T20:00:00.000Z'),
          }),
        reset: mockCreateRequestReset,
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
        expect(mockCreateRequestReset).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()
      })

      expect(screen.getByText('For Nosh Volos.')).toBeInTheDocument()
      const keyInput = screen.getByRole('textbox', { name: 'New API key' }) as HTMLInputElement
      expect(keyInput.value).toBe('ock_fresh_api_key_001')

      // Key step renders no element named "Close" (hideCloseButton={true})
      expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

      // When the key panel appears, the key field has focus (autoFocus)
      expect(document.activeElement).toBe(keyInput)

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

    it('with an existing key: asks "Replace the API key?" first (showing Close), only makes key on confirm', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            apiKey: 'ock_replaced_api_key_002',
            apiKeyCreatedAt: new Date('2026-11-18T20:00:00.000Z'),
          }),
        reset: mockCreateRequestReset,
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

      // Confirmation dialog is shown with a Close button
      expect(screen.getByRole('heading', { name: 'Replace the API key?' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
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
        expect(mockCreateRequestReset).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()
      })

      // In key step, Close button is now absent
      expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

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
    it('asks "Remove the API key?" confirmation, confirms, calls remove mutation, and focuses New API key on close', async () => {
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
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
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
        // Focus is returned to "New API key" (minor 2)
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /^new api key$/i }))
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

  describe('Error handling (openRef, minor 5)', () => {
    it('shows destructive toast and calls request.reset() when direct makeKey fails without open dialog', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () => Promise.reject({ statusCode: 500, message: 'Server error creating key' }),
        reset: mockCreateRequestReset,
      })

      const partnerNoKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
      }

      render(<PartnerApiKeyCard partner={partnerNoKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^new api key$/i }))

      await waitFor(() => {
        expect(mockCreateRequestReset).toHaveBeenCalledTimes(1)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Server error creating key',
          variant: 'destructive',
        })
      })
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows inline error and calls request.reset() when makeKey fails with confirmation dialog open', async () => {
      mockCreateApiKey.mockReturnValue({
        unwrap: () => Promise.reject({ statusCode: 500, message: 'Server error replacing key' }),
        reset: mockCreateRequestReset,
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^new api key$/i }))
      expect(screen.getByRole('heading', { name: 'Replace the API key?' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Make a new key' }))

      await waitFor(() => {
        expect(mockCreateRequestReset).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('alert')).toHaveTextContent('Server error replacing key')
      })
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('shows destructive toast and calls request.reset() when makeKey fails after confirmation dialog was closed', async () => {
      let rejectPromise!: (err: any) => void
      const pendingPromise = new Promise((_, reject) => {
        rejectPromise = reject
      })

      mockCreateApiKey.mockReturnValue({
        unwrap: () => pendingPromise,
        reset: mockCreateRequestReset,
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^new api key$/i }))
      expect(screen.getByRole('heading', { name: 'Replace the API key?' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Make a new key' }))

      // Admin dismisses the confirmation dialog while key creation is in flight
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Now the in-flight request fails
      rejectPromise({ statusCode: 500, message: 'Network lost during key creation' })

      await waitFor(() => {
        expect(mockCreateRequestReset).toHaveBeenCalledTimes(1)
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Network lost during key creation',
          variant: 'destructive',
        })
      })
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('displays inline error in dialog when removeApiKey fails while dialog is open', async () => {
      mockRemoveApiKey.mockReturnValue({
        unwrap: () => Promise.reject({ statusCode: 500, message: 'Failed to delete key from database' }),
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
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete key from database')
      })
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('shows destructive toast when removeApiKey fails after dialog was closed', async () => {
      let rejectPromise!: (err: any) => void
      const pendingPromise = new Promise((_, reject) => {
        rejectPromise = reject
      })

      mockRemoveApiKey.mockReturnValue({
        unwrap: () => pendingPromise,
      })

      const partnerWithKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: new Date('2026-11-18T10:00:00.000Z'),
      }

      render(<PartnerApiKeyCard partner={partnerWithKey} />)

      fireEvent.click(screen.getByRole('button', { name: /^remove key$/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))

      // Admin dismisses the dialog while remove is in flight
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Now the in-flight request fails
      rejectPromise({ statusCode: 500, message: 'Network lost during remove' })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Network lost during remove',
          variant: 'destructive',
        })
      })
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('Real Redux store integration (AC-13, major)', () => {
    it('ensures API key leaves Redux store mutations via request.reset()', async () => {
      const store = setupTestStore()
      const mockCreatePartnerApiKey = jest.fn().mockResolvedValue({
        apiKey: 'ock_test_generated_key_real_store_secret',
        apiKeyCreatedAt: new Date('2026-11-18T12:00:00.000Z'),
      })
      mockPrepareAdminSdk.mockReturnValue({
        partners: () => ({
          createPartnerApiKey: mockCreatePartnerApiKey,
        }),
      })

      mockUseCreatePartnerApiKeyMutation.mockImplementation(
        actualPartnersApi.useCreatePartnerApiKeyMutation
      )

      const partnerNoKey: PartnerAdminDto = {
        ...basePartner,
        userId: 'user-123',
        apiKeyCreatedAt: null,
      }

      render(
        <Provider store={store}>
          <PartnerApiKeyCard partner={partnerNoKey} />
        </Provider>
      )

      const newKeyBtn = screen.getByRole('button', { name: /^new api key$/i })
      fireEvent.click(newKeyBtn)

      // Wait for the key panel to appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'New API key' })).toBeInTheDocument()
      })

      // Assert that after the answer, no entry in store.getState().api.mutations holds the key string
      const mutations = (store.getState() as any).api.mutations
      const serializedMutations = JSON.stringify(mutations)
      expect(serializedMutations).not.toContain('ock_test_generated_key_real_store_secret')
    })
  })
})
