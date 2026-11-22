import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../../i18n/createI18n'
import { markChosenBeforeSignIn, wasChosenBeforeSignIn } from '../../../i18n/languageChoice'
import { makeStore } from '../../../redux/store'
import { SignInScreen, signInErrorMessage } from './SignInScreen'
import { setAccessToken } from '../slices/authSlice'

// Mock RTK Query authApi hook
const mockLogin = jest.fn()
const mockSaveLanguage = jest.fn()
let mockIsLoading = false
jest.mock('../../../api/authApi', () => ({
  useLoginMutation: () => [mockLogin, { isLoading: mockIsLoading }],
  useSetLanguageMutation: () => [mockSaveLanguage, { isLoading: false }],
}))

// Mock admin page navigator
const mockGoHome = jest.fn()
jest.mock('../../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goHome: mockGoHome,
  }),
}))

describe('SignInScreen and signInErrorMessage (row 86)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsLoading = false
    mockSaveLanguage.mockReturnValue({ unwrap: () => Promise.resolve() })
  })

  describe('signInErrorMessage mapping', () => {
    const t = createI18n('en').t

    it('maps 400, 401, 403, and 404 to wrong details in plain words without HTTP code or backend text', () => {
      const expectedKey = 'auth.wrongLogin'
      const expected = "That email and password don't match. Check for typos and try again."

      // Both SDK ApiError (statusCode) and raw response (response.status) shapes must work
      expect(signInErrorMessage({ statusCode: 400 })).toBe(expectedKey)
      expect(signInErrorMessage({ statusCode: 401 })).toBe(expectedKey)
      expect(signInErrorMessage({ statusCode: 403 })).toBe(expectedKey)
      expect(signInErrorMessage({ statusCode: 404 })).toBe(expectedKey)
      expect(signInErrorMessage({ response: { status: 403 } })).toBe(expectedKey)

      // Translated message matches expected English
      expect(t(signInErrorMessage({ statusCode: 400 }))).toBe(expected)

      // Must never leak HTTP code digits into the user-facing text
      ;[400, 401, 403, 404].forEach((code) => {
        const msg = t(signInErrorMessage({ statusCode: code }))
        expect(msg).not.toMatch(new RegExp(String(code)))
        expect(msg).not.toMatch(/unauthorized|forbidden|not found|bad request/i)
      })
    })

    it('maps 429 to rate limit wording in plain words without HTTP code digits', () => {
      expect(signInErrorMessage({ statusCode: 429 })).toBe('auth.tooMany')
      const msg = t(signInErrorMessage({ statusCode: 429 }))
      expect(msg).toBe('Too many tries in a row. Wait a minute, then try again.')
      expect(msg).not.toMatch(/429/)
      expect(msg).not.toMatch(/rate limit/i)
    })

    it('maps 500, network errors, and undefined to server down wording', () => {
      const expectedKey = 'auth.noAnswer'
      const expected = "The co-op's server didn't answer. Check your internet connection and try again in a minute."

      expect(signInErrorMessage({ statusCode: 500 })).toBe(expectedKey)
      expect(signInErrorMessage({ statusCode: 502 })).toBe(expectedKey)
      expect(signInErrorMessage({ statusCode: 503 })).toBe(expectedKey)
      expect(signInErrorMessage(new Error('Failed to fetch'))).toBe(expectedKey)
      expect(signInErrorMessage(undefined)).toBe(expectedKey)
      expect(signInErrorMessage(null)).toBe(expectedKey)
      expect(signInErrorMessage('unknown string error')).toBe(expectedKey)

      expect(t(signInErrorMessage({ statusCode: 500 }))).toBe(expected)

      // Must not leak 500 digits
      expect(t(signInErrorMessage({ statusCode: 500 }))).not.toMatch(/500/)
    })
  })

  describe('SignInScreen UI and interactions', () => {
    const renderSignInScreen = (initialState?: any, lang: 'en' | 'el' = 'en') => {
      const store = makeStore()
      const i18n = createI18n(lang)
      return {
        store,
        i18n,
        ...render(
          <I18nextProvider i18n={i18n}>
            <Provider store={store}>
              <SignInScreen />
            </Provider>
          </I18nextProvider>
        ),
      }
    }

    it('renders the redesign card: logo, "Co-op Admin" h1, email/password fields, and Sign In button', () => {
      renderSignInScreen()

      // The ground must be muted
      const main = screen.getByRole('main')
      expect(main.className).toContain('bg-muted')

      // Logo with alt "OpenCourier"
      const logo = screen.getByAltText('OpenCourier')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/opencourier-sign.png')

      // Exactly one h1: "Co-op Admin"
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Co-op Admin')

      // Card description
      expect(
        screen.getByText('Sign in with the email and password the co-op gave you.')
      ).toBeInTheDocument()

      // Email and password fields with labels
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()

      // Full-width Sign In button
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(submitButton.className).toContain('w-full')
    })

    it('destructive Alert is ABSENT before any submission attempt', () => {
      renderSignInScreen()

      // Alert must not exist in DOM before user submits
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows destructive Alert when submitted with empty email or empty password', async () => {
      renderSignInScreen()

      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)

      // Alert must now appear with plain validation message
      const alert = await screen.findByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('Could not sign in')
      expect(alert).toHaveTextContent('Enter your email and password, then press Sign In.')

      // Login mutation was not called for empty form
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('shows destructive Alert in plain words without HTTP code or backend text on 403 failure', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.reject({ statusCode: 403, data: { message: 'Forbidden' } }),
      })

      renderSignInScreen()

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@example.com' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'badpassword' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('Could not sign in')
      expect(alert).toHaveTextContent("That email and password don't match. Check for typos and try again.")

      // Verify no HTTP code digits or backend text
      expect(alert.textContent).not.toMatch(/403/)
      expect(alert.textContent).not.toMatch(/forbidden/i)
    })

    it('shows destructive Alert in plain words on 429 rate limit failure', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.reject({ statusCode: 429 }),
      })

      renderSignInScreen()

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'rapid@example.com' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Too many tries in a row. Wait a minute, then try again.')
      expect(alert.textContent).not.toMatch(/429/)
    })

    it('shows destructive Alert in plain words when the server fails or is unreachable', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.reject({ statusCode: 500 }),
      })

      renderSignInScreen()

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@coop.gr' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(
        "The co-op's server didn't answer. Check your internet connection and try again in a minute."
      )
      expect(alert.textContent).not.toMatch(/500/)
    })

    it('submits form when Enter key is pressed in the password input', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ session: { accessToken: 'token-enter-123' } }),
      })

      renderSignInScreen()

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@coop.gr' } })
      const passwordInput = screen.getByLabelText('Password')
      fireEvent.change(passwordInput, { target: { value: 'mysecret' } })

      // Press Enter inside password input (submitting the real form)
      const form = passwordInput.closest('form')
      expect(form).not.toBeNull()
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@coop.gr',
          password: 'mysecret',
        })
      })
    })

    it('disables button and shows spinner with "Signing in…" while loading', () => {
      mockIsLoading = true
      renderSignInScreen()

      const button = screen.getByRole('button', { name: /Signing in…/ })
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('Signing in…')
      // Spinner must be rendered inside button
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('successful sign in trims email, stores accessToken in Redux, and navigates home', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ session: { accessToken: 'valid-token-xyz' } }),
      })

      const { store } = renderSignInScreen()
      const dispatchSpy = jest.spyOn(store, 'dispatch')

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  admin@coop.gr  ' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correctpassword' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        // Email must be trimmed before submission
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@coop.gr',
          password: 'correctpassword',
        })
      })

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(setAccessToken('valid-token-xyz'))
      })

      // Navigates home and Alert remains absent
      expect(mockGoHome).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('applies stored account language at sign in when language was not chosen on the card (cross check 2)', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ session: { accessToken: 'token-xyz' }, language: 'el' }),
      })

      const { i18n } = renderSignInScreen(undefined, 'en')

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@coop.gr' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correctpassword' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      // The account's language 'el' was applied to i18n and saved in document.documentElement.lang
      await waitFor(() => {
        expect(i18n.language).toBe('el')
      })
      expect(mockSaveLanguage).not.toHaveBeenCalled()
    })

    it('saves language to account when admin explicitly chose language before sign in (decision 47.32)', async () => {
      mockLogin.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ session: { accessToken: 'token-xyz' }, language: 'el' }),
      })

      markChosenBeforeSignIn()

      renderSignInScreen(undefined, 'en')

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@coop.gr' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correctpassword' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(mockSaveLanguage).toHaveBeenCalledWith('en')
      })
      // wasChosenBeforeSignIn is reset
      expect(wasChosenBeforeSignIn()).toBe(false)
    })
  })
})
